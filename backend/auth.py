import traceback
import jwt
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from setup.extensions import db  
from models import User \

auth = Blueprint('auth', __name__)

@auth.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "No input data provided"}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not username or not email or not password:
            return jsonify({"message": "Missing input data"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"message": "Username already exists"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Email already exists"}), 400

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, email=email, password=hashed_password, role=1)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "User successfully registered"}), 201
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"An error occurred: {str(e)}"}), 400


@auth.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "No input data provided"}), 400

        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"message": "Missing input data"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"message": "User does not exist"}), 400
        if not check_password_hash(user.password, password):
            return jsonify({"message": "Invalid password"}), 400

        token = jwt.encode({'user_id': user.id, 'exp': datetime.utcnow() + timedelta(hours=24)}, 
                           current_app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({"message": "Login Successful", "token": token, 
                        "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role, "date_created": user.date_created}}), 200
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"An error occurred: {str(e)}"}), 400


@auth.route("/toggle-role", methods=["POST"])
def toggle_role():
    print("Toggling user role")
    token = request.headers.get("Authorization")
    if not token:
        print("Token is missing!")
        return jsonify({"message": "Token is missing!"}), 401

    try:
        print("Token found")
        print(token)
        token = token.split(" ")[1]  # Remove "Bearer " prefix
        decoded_token = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(decoded_token['user_id'])
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Toggle role: if currently admin (0), change to regular (1); else, change to admin (0)
        user.role = 1 if user.role == 0 else 0
        
        db.session.commit()
        return jsonify({"message": "User role toggled", "new_role": user.role}), 200
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"An error occurred: {str(e)}"}), 400
    

@auth.route("/me", methods=["GET"])
def get_current_user():
    token = request.headers.get("Authorization")

    if not token:
        return jsonify({"message": "Token is missing!"}), 401

    try:
        token = token.split(" ")[1]  # Remove "Bearer " prefix
        decoded_token = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(decoded_token['user_id'])

        if not user:
            return jsonify({"message": "User not found!"}), 404

        return jsonify({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "date_created": user.date_created
        }), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Session expired. Please log in again."}), 401
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid session. Please log in again."}), 401


