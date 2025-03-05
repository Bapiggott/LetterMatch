import traceback
from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import Game, Player, Word

word_chain_bp = Blueprint('word_chain', __name__)

@word_chain_bp.route("/create", methods=["POST"])
def create_word_chain():
    try:
        data = request.get_json()
        room = data['room']

        existing_game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if existing_game:
            return jsonify({"error": "Game room already exists"}), 400

        new_game = Game(room=room, game_type="WordChain")
        db.session.add(new_game)
        db.session.commit()

        return jsonify({"message": f"Game '{room}' created!"}), 201

    except Exception as e:
        print(f"Error in create_word_chain: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@word_chain_bp.route("/join", methods=["POST"])
def join_word_chain():
    try:
        data = request.get_json()
        room = data['room']
        username = data.get('username', "Guest")

        game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        new_player = Player(username=username, game_id=game.id)
        db.session.add(new_player)
        db.session.commit()

        players = [p.username for p in game.players]
        return jsonify({"message": f"{username} joined {room}", "players": players}), 200

    except Exception as e:
        print(f"Error in join_word_chain: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@word_chain_bp.route("/submit_word", methods=["POST"])
def submit_word_chain():
    try:
        data = request.get_json()
        room = data['room']
        word = data['word']
        username = data['username']

        game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        last_word = Word.query.filter_by(game_id=game.id).order_by(Word.date_added.desc()).first()
        if last_word and last_word.word[-1] != word[0]:  # Chain rule validation
            return jsonify({"error": "Word does not follow the chain rule"}), 400

        new_word = Word(word=word, game_id=game.id, username=username)
        db.session.add(new_word)
        db.session.commit()

        return jsonify({"message": "Word accepted", "word": word, "username": username}), 200

    except Exception as e:
        print(f"Error in submit_word_chain: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500
