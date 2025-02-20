from flask import Flask, jsonify
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import desc
import traceback
from flask_cors import CORS
import jwt
from flask_migrate import Migrate

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///LetterMatch.db'
app.config['SECRET_KEY'] = str('VerySecretKey!')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
db = SQLAlchemy(app)
# CORS(app)
migrate = Migrate(app, db)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, unique=True, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    password = db.Column(db.String, nullable=False)
    role = db.Column(db.Integer, default=1)  # Regular user = role 1
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

    friendships_1 = db.relationship('Friendship', foreign_keys='Friendship.username_1', backref='user_1', lazy=True)
    friendships_2 = db.relationship('Friendship', foreign_keys='Friendship.username_2', backref='user_2', lazy=True)



class Friendship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username_1 = db.Column(db.String, db.ForeignKey('user.username'), nullable=False)
    username_2 = db.Column(db.String, db.ForeignKey('user.username'), nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})


def addUser(username, email, password, role):
        new_user = User(username=username, email=email, password=password, role=role )
        db.session.add(new_user)
        db.session.commit()

# The below function will only work if both users have already 
# been added to the database
@app.route("/add-friend", methods=["POST"])
def add_friend():
    try:

        data = request.get_json() 

        username = data.get('username')
        addFriendUsername = data.get('addFriendUsername')

        print(f"About to add friendship between {addFriendUsername} and {username}.")

        friendship = Friendship(username_1=username, username_2=addFriendUsername)
        db.session.add(friendship)
        db.session.commit()

        return jsonify({"message": "Friend successfully added"}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Failed to add friend"}), 400

if __name__ == "__main__":
    with app.app_context():  # Ensure app context is set
        db.create_all()  # Create tables
    app.run(debug=True, port=5000)

