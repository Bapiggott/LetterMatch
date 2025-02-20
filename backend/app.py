import traceback
import eventlet
import eventlet.wsgi
eventlet.monkey_patch()

from flask import Flask, request, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from extensions import db, socketio  # Import from extensions.py
from models import User, Friendship  # Import models
from auth import auth  # Import auth routes

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///LetterMatch.db'
app.config['SECRET_KEY'] = 'VerySecretKey!'
CORS(app)

# Initialize Extensions
db.init_app(app)
migrate = Migrate(app, db)
socketio.init_app(app)

# Register Blueprints
app.register_blueprint(auth, url_prefix="/auth")

    
# Routes
@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})

# The below function will only work if both users have already 
# been added to the database
@app.route("/add-friend", methods=["POST"])
def add_friend():
    try:

        data = request.get_json() 

        username = data.get('username')
        addFriendUsername = data.get('addFriendUsername')

        print(f"About to add friendship between {addFriendUsername} and {username}.")

        friendship = Friendship(username_1=username, username_2=addFriendUsername)
        db.session.add(friendship)
        db.session.commit()

        return jsonify({"message": "Friend successfully added"}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Failed to add friend"}), 400

if __name__ == "__main__":
    with app.app_context():  # Ensure app context is set
        db.create_all()  # Create tables
    app.run(debug=True, port=5000)

    
# WebSocket Game Logic
games = {}  # Stores ongoing games

@socketio.on('create_game')
def create_game(data):
    room = data['room']
    if room not in games:
        games[room] = {"players": [], "word_chain": [], "turn": 0}
    join_room(room)
    emit('game_created', {"room": room}, room=room)

@socketio.on('join_game')
def join_game(data):
    room = data['room']
    username = data['username']
    
    if room in games:
        games[room]["players"].append(username)
        join_room(room)
        emit('player_joined', {"username": username, "players": games[room]["players"]}, room=room)
    else:
        emit('error', {"message": "Room does not exist"})


@socketio.on('submit_word')
def submit_word(data):
    room = data['room']
    word = data['word']
    username = data['username']

    if room in games:
        game = games[room]
        
        if len(game["players"]) == 0:  # Prevent division by zero
            emit('error', {"message": "No players in the room"}, room=room)
            return

        if not game["word_chain"] or game["word_chain"][-1][-1] == word[0]:  # Chain rule validation
            game["word_chain"].append(word)
            game["turn"] = (game["turn"] + 1) % len(game["players"])
            emit('word_accepted', {"word": word, "username": username, "turn": game["players"][game["turn"]]}, room=room)
        else:
            emit('word_rejected', {"message": "Word does not follow the chain rule"}, room=room)

    
def get_jwt_token(request):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"message": "Token is missing!"}), 401
    try:
        token = token.split(" ")[1] 
        decoded_token = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = decoded_token['user_id']
        return user_id
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return jsonify({"message": "Invalid or expired token!"}), 401

    
if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Ensure database tables exist

    socketio.run(app, debug=True, port=5000, host='0.0.0.0')