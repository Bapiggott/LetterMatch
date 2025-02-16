from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
import random

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

games = {}  # Stores ongoing games

@app.route('/')
def index():
    return render_template("index.html")

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
        if not game["word_chain"] or game["word_chain"][-1][-1] == word[0]:  # Check chain rule
            game["word_chain"].append(word)
            game["turn"] = (game["turn"] + 1) % len(game["players"])
            emit('word_accepted', {"word": word, "username": username, "turn": game["players"][game["turn"]]}, room=room)
        else:
            emit('word_rejected', {"message": "Word does not follow the chain rule"}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True)

