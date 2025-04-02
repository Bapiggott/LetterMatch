import traceback
import os
import base64
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import User, Friendship, Game
from auth import get_current_user_username
from datetime import datetime

profile_bp = Blueprint("profile_bp", __name__)

@profile_bp.route("", methods=["GET"], strict_slashes=False)
def get_profile():
    try:
        param_username = request.args.get("username")
        if not param_username:
            param_username = get_current_user_username()
            if not param_username:
                return jsonify({"error": "No username provided and no current user."}), 401

        user = User.query.filter_by(username=param_username).first()
        if not user:
            return jsonify({"error": f"User '{param_username}' not found"}), 404

        friend_count = Friendship.query.filter(
            (Friendship.username_1 == user.username) |
            (Friendship.username_2 == user.username)
        ).count()

        return jsonify({
            "username": user.username,
            "email": user.email,
            "profile_pic": user.profile_pic,
            "profile_pic_base64": user.profile_pic_base64 or "",
            "friend_count": friend_count / 2,
            "games_won": getattr(user, "games_won", 0),
            "games_played": getattr(user, "games_played", 0)
        }), 200

    except Exception as e:
        print("Error in get_profile:", e)
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@profile_bp.route("/upload_pic_base64", methods=["POST"])
def upload_profile_pic_base64():
    try:
        username = request.form.get("username")
        if not username:
            return jsonify({"error": "No username field"}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": f"User '{username}' not found"}), 404

        file = request.files.get("image", None)
        if not file:
            return jsonify({"error": "No file 'image' provided"}), 400

        raw_bytes = file.read()
        b64_str = base64.b64encode(raw_bytes).decode('utf-8')
        user.profile_pic_base64 = b64_str
        db.session.commit()

        return jsonify({
            "message": "Profile picture uploaded successfully!",
            "profile_pic_base64": (b64_str[:50] + '...') if len(b64_str) > 50 else b64_str
        }), 200

    except Exception as e:
        print("Error in upload_profile_pic_base64:", e)
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@profile_bp.route("/games/history", methods=["GET"])
def get_game_history():
    try:
        username = request.args.get("username")
        if not username:
            username = get_current_user_username()
            if not username:
                return jsonify({"error": "No username provided"}), 400

        # Get all games where the player participated
        games = Game.query.filter(Game.players.any(username=username)).order_by(Game.created_at.desc()).limit(20).all()

        game_history = []
        for game in games:
            # Get scores for all players
            scores = {p.username: p.score for p in game.players}
            
            # Determine winner (player with highest score)
            winner = max(game.players, key=lambda p: p.score).username if game.players else None
            
            game_history.append({
                "game_id": game.id,
                "room_name": game.room_name,
                "created_at": game.created_at.isoformat(),
                "players": [p.username for p in game.players],
                "scores": scores,
                "winner": winner
            })

        return jsonify({"games": game_history}), 200

    except Exception as e:
        print("Error in get_game_history:", e)
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@profile_bp.route("", methods=["PUT"], strict_slashes=False)
def update_profile():
    try:
        param_username = request.args.get("username")
        if not param_username:
            param_username = get_current_user_username()
            if not param_username:
                return jsonify({"error": "No user context"}), 401

        user = User.query.filter_by(username=param_username).first()
        if not user:
            return jsonify({"error": f"User '{param_username}' not found"}), 404

        data = request.get_json()
        new_pic = data.get("profile_pic")
        new_email = data.get("email")

        if new_pic:
            user.profile_pic = new_pic
        if new_email:
            user.email = new_email

        db.session.commit()
        return jsonify({"message": "Profile updated successfully!"}), 200

    except Exception as e:
        print("Error in update_profile:", e)
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500