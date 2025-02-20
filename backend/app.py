import traceback
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from auth import auth

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///LetterMatch.db'
app.config['SECRET_KEY'] = 'VerySecretKey!'
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Initialize Extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, cors_allowed_origins="*")
app.register_blueprint(auth, url_prefix="/auth")  # All auth routes are now under /auth/

# Define Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, unique=True, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    password = db.Column(db.String, nullable=False)
    role = db.Column(db.Integer, default=1)  # Regular user = role 1
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

    friendships_1 = db.relationship('Friendship', foreign_keys='Friendship.username_1', backref='user_1', lazy=True)
    friendships_2 = db.relationship('Friendship', foreign_keys='Friendship.username_2', backref='user_2', lazy=True)

class Friendship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username_1 = db.Column(db.String, db.ForeignKey('user.username'), nullable=False)
    username_2 = db.Column(db.String, db.ForeignKey('user.username'), nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

    
# Routes
@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})



def addUser(username, email, password, role):
        new_user = User(username=username, email=email, password=password, role=role )
        db.session.add(new_user)
        db.session.commit()

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

@app.route("/register", methods=["POST"])
def register():
    try: 
        data = request.get_json()
        if not data:
            return jsonify({"message": "No input data provided"}), 400
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        #role = data.get('role')
        if not username or not email or not password:
            return jsonify({"message": "Missing input data"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"message": "Username already exists"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Email already exists"}), 400
        hashed_password = generate_password_hash(password, method='sha256')
        newUser = User(username=username, email=email, password=hashed_password, role=1)
        db.session.add(newUser)
        db.session.commit()
        return jsonify({"message": "User successfully registered"}), 201
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"An error occurred: {str(e)}"}), 400

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "No input data provided"}), 400
        email = data.get('email')
        password = data.get('password')
        if not email or not password:
            return jsonify({"message": "Missing input data"}), 400
        user = db.session.query(User.id, User.email, User.role, User.date_created).filter_by(email=email).first()
        if not user:
            return jsonify({"message": "User does not exist"}), 400
        if not check_password_hash(user.password, password):
            return jsonify({"message": "Invalid password"}), 400
        token = jwt.encode({'user_id': user.id, 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({"message": "Login Successful", "token": token, "user": {"id": user.id, "email": user.email, "role": user.role, "date_created": user.date_created}}), 200
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"An error occurred: {str(e)}"}), 400
    
if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Ensure database tables exist
    socketio.run(app, debug=True, port=5000)
