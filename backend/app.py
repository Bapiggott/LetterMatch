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

@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})

if __name__ == "__main__":
    with app.app_context():  # Ensure app context is set
        db.create_all()  # Create tables
    app.run(debug=True, port=5000)
