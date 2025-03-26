import eventlet
eventlet.monkey_patch()
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
from games.answer_checker import answer_checker_bp
# from games.letter_match import letter_match_bp
from friends import friends_bp  # Import the new friends module
from setup.seed_data import seed_question_sets # Import seed function
from profile_user import profile_bp
import jwt
from chat import chat_bp, get_active_chat_details, get_all_active_chat_details_as_array


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
app.register_blueprint(answer_checker_bp, url_prefix="/answer_checker")
# app.register_blueprint(letter_match_bp, url_prefix="/letter_match")
app.register_blueprint(friends_bp, url_prefix="/friends")
app.register_blueprint(profile_bp, url_prefix="/profile")
app.register_blueprint(chat_bp, url_prefix="/chat")

    
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



# Chat Websockets
# to be moved later

from flask_socketio import SocketIO, emit, join_room, leave_room
from models import User, Message, Chat, ChatParticipant
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet") 


@socketio.on('create_chat')
def create_chat(data):
    sender_username = data['sender_username']
    recipient_username = data['recipient_username']

    sender = User.query.filter_by(username=sender_username).first()
    recipient = User.query.filter_by(username=recipient_username).first()

    sender_id = sender.id
    recipient_id = recipient.id

    chats_with_sender = Chat.query.join(ChatParticipant).filter(ChatParticipant.user_id == sender_id).all()
    chat = None
    for c in chats_with_sender:
        recipient_participant = ChatParticipant.query.filter_by(chat_id=c.id, user_id=recipient_id).first()
        if recipient_participant:
            chat = c
            break

    if not chat:
        chat = Chat()
        db.session.add(chat)
        db.session.commit()
        participant_1 = ChatParticipant(chat_id=chat.id, user_id=sender_id, chat_active=True)
        participant_2 = ChatParticipant(chat_id=chat.id, user_id=recipient_id, chat_active=True)
        print(f"Creating chat for sender: {sender_id}, recipient: {recipient_id}")
        db.session.add(participant_1)
        db.session.add(participant_2)
        db.session.commit()

    room_name = chat.id
    
    join_room(room_name)

    emit('joined_room', {'room_name': room_name}, room=sender_id)
    emit('joined_room', {'room_name': room_name}, room=recipient_id)

    chat_details = get_all_active_chat_details_as_array(sender.id)
    new_chat_details = get_active_chat_details(chat.id, sender.id)

    emit('chat_created', {'chat_details': chat_details, 'new_chat': new_chat_details}, room=room_name)

@socketio.on('create_message')
def create_message(data):
    sender_username = data['sender_username']
    recipient_username = data['recipient_username']
    message_body = data['message_body']

    sender = User.query.filter_by(username=sender_username).first()
    recipient = User.query.filter_by(username=recipient_username).first()

    sender_id = sender.id
    recipient_id = recipient.id

    chats_with_sender = Chat.query.join(ChatParticipant).filter(ChatParticipant.user_id == sender_id).all()
    chat = None
    for c in chats_with_sender:
        recipient_participant = ChatParticipant.query.filter_by(chat_id=c.id, user_id=recipient_id).first()
        if recipient_participant:
            chat = c
            break

    db.session.add(Message(chat_id=chat.id, sender_id=sender_id, message_body=message_body, read=False))
    db.session.commit()  
    
    chat_details = get_all_active_chat_details_as_array(sender.id)


    room_name = chat.id

    join_room(room_name)

    emit('message_created',  {'chat_details': chat_details} , room=room_name)


if __name__ == "__main__": 
    socketio.run(app, debug=True, port=5000)