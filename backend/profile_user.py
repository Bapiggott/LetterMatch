import traceback
import os
import base64
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import User, Friendship
from auth import get_current_user_username

profile_bp = Blueprint("profile_bp", __name__)


@profile_bp.route("", methods=["GET"], strict_slashes=False)
def get_profile():
    """
    GET /profile?username=someName -> fetch that user's profile
    GET /profile                  -> if no ?username=, fetch *current* user's profile
    Return JSON:
      {
        "username": "...",
        "email": "...",
        "profile_pic": "...",
        "friend_count": ...,
        "games_won": ...,
        "games_played": ...
      }
    """
    try:
        # 1) Check for ?username
        param_username = request.args.get("username")

        if not param_username:
            # 2) If no username provided, interpret as "current" user
            # For example, if you store the user in a session or token:
            # param_username = session.get("username")  # or decode token
            # If there's no user logged in, return 401
            param_username = get_current_user_username()
            if not param_username:
                return jsonify({"error": "No username provided and no current user."}), 401

        # 3) Query the DB for that user
        user = User.query.filter_by(username=param_username).first()
        if not user:
            return jsonify({"error": f"User '{param_username}' not found"}), 404

        # 4) Count how many friends (any row where username_1 == this user or username_2 == this user)
        friend_count = Friendship.query.filter(
            (Friendship.username_1 == user.username) |
            (Friendship.username_2 == user.username)
        ).count()

        # 5) Return user profile info
        return jsonify({
            "username": user.username,
            "email": user.email,
            "profile_pic": user.profile_pic,  # or user.profile_pic if you named it differently
            "friend_count": friend_count / 2,
            "games_won": getattr(user, "games_won", 0),
            "games_played": getattr(user, "games_played", 0),
            "upload_profile_pic_base64": user.profile_pic_base64 or ""
        }), 200

    except Exception as e:
        print("Error in get_profile:", e)
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@profile_bp.route("/upload_pic_base64", methods=["POST"])
def upload_profile_pic_base64():
    """
    POST /profile/upload_pic_base64
    form-data:
      - "username": the user name (or parse from token)
      - "image": the file
    We read the file, convert to base64, store in user.profile_pic_base64.
    """
    try:
        # For example: read from form
        username = request.form.get("username")
        if not username:
            return jsonify({"error": "No username field"}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": f"User '{username}' not found"}), 404

        file = request.files.get("image", None)
        if not file:
            return jsonify({"error": "No file 'image' provided"}), 400

        # read the file bytes
        raw_bytes = file.read()
        # convert to base64
        b64_str = base64.b64encode(raw_bytes).decode('utf-8')
        # store in DB
        user.profile_pic_base64 = b64_str
        db.session.commit()

        return jsonify({
            "message": "Profile picture uploaded (base64) successfully",
            # Maybe show partial base64 for debugging
            "profile_pic_base64": (b64_str[:50] + '...') if len(b64_str) > 50 else b64_str
        }), 200

    except Exception as e:
        print("Error in upload_profile_pic_base64:", e)
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500
    
@profile_bp.route("", methods=["PUT"], strict_slashes=False)
def update_profile():
    """
    PUT /profile?username=someName  (optional)
    or PUT /profile to update the current user
    Body JSON: { "profile_pic": "...", "email": "..." }
    """
    try:
        param_username = request.args.get("username")
        if not param_username:
            # interpret as "current user"
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
        return jsonify({"message": "Profile updated"}), 200

    except Exception as e:
        print("Error in update_profile:", e)
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500
