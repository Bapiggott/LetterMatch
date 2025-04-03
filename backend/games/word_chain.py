import traceback
from flask import Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from setup.extensions import db
from models import Game, Player, Word
from threading import Timer

word_chain_bp = Blueprint('word_chain', __name__)

# Keep track of active timers for the "start_timer" endpoint
active_timers = {}

@word_chain_bp.route("/create", methods=["POST"])
def create_word_chain():
    """
    Create a new WordChain game with a given room name (if not already taken).
    """
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


@word_chain_bp.route("/get_state", methods=["GET"])
def get_state():
    """
    Returns the current game state (list of players and all submitted words).
    """
    room = request.args.get("room")
    game = Game.query.filter_by(room=room, game_type="WordChain").first()
    if not game:
        return jsonify({"error": "Game not found"}), 404

    players = [p.username for p in game.players]
    words = [w.word for w in Word.query.filter_by(game_id=game.id).order_by(Word.date_added.asc()).all()]

    return jsonify({
        "players": players,
        "wordChain": words
    }), 200


@word_chain_bp.route("/join", methods=["POST"])
def join_word_chain():
    """
    Join a WordChain game in the specified room (creates a Player entry).
    """
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
    """
    Submit a word to the chain. Validates:
      - The room must exist
      - The new word must start with the last letter of the previous word (chain rule)
      - The new word must not be a repeat (already submitted in this game)
    """
    try:
        data = request.get_json()
        room = data['room']
        word = data['word']
        username = data['username']

        game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        # Check chain rule
        last_word_obj = Word.query.filter_by(game_id=game.id).order_by(Word.date_added.desc()).first()
        if last_word_obj and last_word_obj.word[-1].lower() != word[0].lower():
            return jsonify({"error": "Word does not follow the chain rule"}), 400

        # Check for repeats
        existing_same_word = Word.query.filter_by(game_id=game.id, word=word).first()
        if existing_same_word:
            return jsonify({"error": "That word was already used before!"}), 400

        # If all good, add the new word
        new_word = Word(word=word, game_id=game.id, username=username)
        db.session.add(new_word)
        db.session.commit()

        return jsonify({"message": "Word accepted", "word": word, "username": username}), 200

    except Exception as e:
        print(f"Error in submit_word_chain: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500


@word_chain_bp.route("/kick_player", methods=["POST"])
def kick_player():
    """
    Allows the game admin (the first player in room order) to remove another player.
    """
    try:
        data = request.get_json()
        room = data['room']
        admin_username = data['admin_username']
        player_to_kick = data['username']

        game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        # The first player in the room is the admin
        admin = Player.query.filter_by(game_id=game.id).order_by(Player.id.asc()).first()
        if not admin or admin.username != admin_username:
            return jsonify({"error": "Only the admin can kick players"}), 403

        # Check if the player exists
        player = Player.query.filter_by(username=player_to_kick, game_id=game.id).first()
        if not player:
            return jsonify({"error": f"Player '{player_to_kick}' is not in the game"}), 404

        # Remove the player
        db.session.delete(player)
        db.session.commit()

        # Return the updated list
        players = [p.username for p in game.players]
        return jsonify({"message": f"Player '{player_to_kick}' was kicked out", "players": players}), 200

    except Exception as e:
        print(f"Error in kick_player: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500


@word_chain_bp.route("/start_timer", methods=["POST"])
def start_timer():
    """
    Starts a server-side timer for the game, used primarily in "online" mode.
    """
    try:
        data = request.get_json()
        room = data['room']
        admin_username = data['admin_username']
        duration = data.get('duration', 30)  # Default to 30 seconds

        game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        # Only admin can start/stop the timer
        admin = Player.query.filter_by(game_id=game.id).order_by(Player.id.asc()).first()
        if not admin or admin.username != admin_username:
            return jsonify({"error": "Only the admin can start the timer"}), 403

        # If a timer is already running, cancel it
        if room in active_timers:
            active_timers[room].cancel()

        # Timer expiration callback
        def timer_expired():
            del active_timers[room]  # Remove from active timers
            print(f"Time's up for {room}!")  # Or handle end-of-round logic

        # Start a new timer
        timer = Timer(duration, timer_expired)
        timer.start()
        active_timers[room] = timer

        return jsonify({"message": f"Timer started for {duration} seconds"}), 200

    except Exception as e:
        print(f"Error in start_timer: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500


@word_chain_bp.route("/veto_word", methods=["POST"])
def veto_word():
    """
    Allows the admin to remove a previously submitted word (maybe it's invalid).
    """
    try:
        data = request.get_json()
        room = data['room']
        admin_username = data['admin_username']
        word_to_veto = data['word']

        game = Game.query.filter_by(room=room, game_type="WordChain").first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        # Only admin can veto words
        admin = Player.query.filter_by(game_id=game.id).order_by(Player.id.asc()).first()
        if not admin or admin.username != admin_username:
            return jsonify({"error": "Only the admin can veto words"}), 403

        # Check if the word is in the chain
        w = Word.query.filter_by(game_id=game.id, word=word_to_veto).first()
        if not w:
            return jsonify({"error": f"Word '{word_to_veto}' not found in the game"}), 404

        # Remove it
        db.session.delete(w)
        db.session.commit()

        return jsonify({"message": f"Word '{word_to_veto}' was vetoed"}), 200

    except Exception as e:
        print(f"Error in veto_word: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500