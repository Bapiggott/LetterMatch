import traceback
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from .models import db, User  # Import from models.py if structured separately

auth = Blueprint("auth", __name__)

def get_jwt_token(request):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"message": "Token is missing!"}), 401
    try:
        token = token.split(" ")[1]  # Remove 'Bearer ' prefix
        decoded_token = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = decoded_token['user_id']
        return user_id
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return jsonify({"message": "Invalid or expired token!"}), 401

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

        hashed_password = generate_password_hash(password, method='sha256')
        newUser = User(username=username, email=email, password=hashed_password, role=1)
        db.session.add(newUser)
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

        token = jwt.encode(
            {'user_id': user.id, 'exp': datetime.utcnow() + timedelta(hours=24)},
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        return jsonify({
            "message": "Login Successful",
            "token": token,
            "user": {"id": user.id, "email": user.email, "role": user.role, "date_created": user.date_created}
        }), 200
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"An error occurred: {str(e)}"}), 400
