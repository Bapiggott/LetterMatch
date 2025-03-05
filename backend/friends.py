import traceback
from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import User, Friendship

friends_bp = Blueprint('friends', __name__)

@friends_bp.route("/add", methods=["POST"])
def add_friend():
    try:
        data = request.get_json()
        username = data.get('username')
        add_friend_username = data.get('addFriendUsername')

        if not username or not add_friend_username:
            return jsonify({"message": "Missing input data"}), 400

        if username == add_friend_username:
            return jsonify({"message": "You cannot add yourself as a friend!"}), 400

        user = User.query.filter_by(username=username).first()
        friend = User.query.filter_by(username=add_friend_username).first()

        if not user:
            return jsonify({"message": "User not found"}), 400

        if not friend:
            return jsonify({"message": "Friend username does not exist"}), 400

        existing_friendship = Friendship.query.filter(
            (Friendship.username_1 == username) & (Friendship.username_2 == add_friend_username)
        ).first()

        if existing_friendship:
            return jsonify({"message": "Friendship already exists"}), 400

        new_friendship = Friendship(username_1=username, username_2=add_friend_username)
        db.session.add(new_friendship)
        new_friendship = Friendship(username_1=add_friend_username, username_2=username)
        db.session.add(new_friendship)
        db.session.commit()

        return jsonify({"message": f"{add_friend_username} added as a friend!"}), 201

    except Exception as e:
        print(f"Error in add_friend: {e}")
        traceback.print_exc()
        return jsonify({"message": "Server error"}), 500
