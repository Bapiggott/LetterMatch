from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///LetterMatch.db'
app.config['SECRET_KEY'] = 'VerySecretKey!'
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Initialize Extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, cors_allowed_origins="*")

# Define Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, unique=True, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    password = db.Column(db.String, nullable=False)
    role = db.Column(db.Integer, default=1)  # Regular user = role 1
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

# Routes
@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})

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


if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Ensure database tables exist
    socketio.run(app, debug=True, port=5000)
