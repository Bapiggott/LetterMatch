import traceback
"""import eventlet
import eventlet.wsgi
eventlet.monkey_patch()"""

from flask import Flask, request, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from setup.extensions import db# , socketio  # Import from extensions.py
from models import User, Friendship  # Import models
from auth import auth  # Import auth routes
from games.word_chain import word_chain_bp
from games.word_blitz import word_blitz_bp
# from games.letter_match import letter_match_bp
from friends import friends_bp  # Import the new friends module
from setup.seed_data import seed_question_sets # Import seed function


app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///LetterMatch.db'
app.config['SECRET_KEY'] = 'VerySecretKey!'
CORS(app)

# Initialize Extensions
db.init_app(app)
migrate = Migrate(app, db)
#socketio.init_app(app)

# Register Blueprints
app.register_blueprint(auth, url_prefix="/auth")
app.register_blueprint(word_chain_bp, url_prefix="/word_chain")
app.register_blueprint(word_blitz_bp, url_prefix="/word_blitz")
# app.register_blueprint(letter_match_bp, url_prefix="/letter_match")
app.register_blueprint(friends_bp, url_prefix="/friends")

    
# Routes
@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})


"""if __name__ == "__main__":
    with app.app_context():  # Ensure app context is set
        db.create_all()  # Create tables
    app.run(debug=True, port=5000)"""

    
def get_jwt_token(request):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"message": "Token is missing!"}), 401
    try:
        token = token.split(" ")[1] 
        decoded_token = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = decoded_token['user_id']
        return user_id
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return jsonify({"message": "Invalid or expired token!"}), 401

with app.app_context():
    db.create_all()  # Ensure all tables exist
    seed_question_sets()
if __name__ == "__main__": 
    app.run(debug=True, port=5000)