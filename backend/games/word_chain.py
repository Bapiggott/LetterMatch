import traceback
from flask import Blueprint, request, jsonify
from extensions import db, socketio
from models import Game, Player, Word, User
from flask_socketio import emit, join_room

word_chain_bp = Blueprint('word_chain', __name__)

@socketio.on('create_word_chain')
def create_word_chain(data):
    try:
        room = data['room']
        existing_game = Game.query.filter_by(room=room, game_type="WordChain").first()

        if existing_game:
            emit('error', {"message": "Game room already exists"})
            return

        new_game = Game(room=room, game_type="WordChain")
        db.session.add(new_game)
        db.session.commit()

        join_room(room)
        emit('game_created', {"room": room, "game_type": "WordChain"}, room=room)
    
    except Exception as e:
        print(f"Error in create_word_chain: {e}")
        traceback.print_exc()
        emit('error', {"message": "Server error"})

@socketio.on('join_word_chain')
def join_word_chain(data):
    try:
        room = data['room']
        username = data['username']

        game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if not game:
            emit('error', {"message": "Room does not exist"})
            return

        if not User.query.filter_by(username=username).first():
            emit('error', {"message": "User does not exist"})
            return

        new_player = Player(username=username, game_id=game.id)
        db.session.add(new_player)
        db.session.commit()

        join_room(room)
        players = [p.username for p in game.players]
        emit('player_joined', {"username": username, "players": players}, room=room)
    
    except Exception as e:
        print(f"Error in join_word_chain: {e}")
        traceback.print_exc()
        emit('error', {"message": "Server error"})

@socketio.on('submit_word_chain')
def submit_word_chain(data):
    try:
        room = data['room']
        word = data['word']
        username = data['username']

        game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if not game:
            emit('error', {"message": "Room does not exist"})
            return

        last_word = Word.query.filter_by(game_id=game.id).order_by(Word.date_added.desc()).first()
        if last_word and last_word.word[-1] != word[0]:  # Chain rule validation
            emit('word_rejected', {"message": "Word does not follow the chain rule"}, room=room)
            return

        new_word = Word(word=word, game_id=game.id, username=username)
        db.session.add(new_word)
        db.session.commit()

        emit('word_accepted', {"word": word, "username": username}, room=room)

    except Exception as e:
        print(f"Error in submit_word_chain: {e}")
        traceback.print_exc()
        emit('error', {"message": "Server error"})
