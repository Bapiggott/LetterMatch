import eventlet
eventlet.monkey_patch()
import traceback
"""import eventlet
import eventlet.wsgi
eventlet.monkey_patch()"""

from flask import Flask, request, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from setup.extensions import db# , socketio  # Import from extensions.py
from models import User, Friendship  # Import models
from models import User, Message, Chat, ChatParticipant
from auth import auth  # Import auth routes
from games.word_chain import word_chain_bp
from games.word_blitz import word_blitz_bp
from games.answer_checker import answer_checker_bp
from games.letter_match import letter_match_bp
from friends import friends_bp  # Import the new friends module
from setup.seed_data import seed_question_sets # Import seed function
from profile_user import profile_bp
import jwt
from chat import chat_bp, get_active_chat_details, get_all_active_chat_details_as_array
from utils.auth_utils import get_user_from_token


app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///LetterMatch.db'
app.config['SECRET_KEY'] = 'VerySecretKey!'
CORS(app)

# Initialize Extensions
db.init_app(app)
migrate = Migrate(app, db)
#socketio.init_app(app)
#added
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# Register Blueprints
app.register_blueprint(auth, url_prefix="/auth")
app.register_blueprint(word_chain_bp, url_prefix="/word_chain")
app.register_blueprint(word_blitz_bp, url_prefix="/word_blitz")
app.register_blueprint(answer_checker_bp, url_prefix="/answer_checker")
app.register_blueprint(letter_match_bp, url_prefix="/letter_match")
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

"""from flask_socketio import SocketIO, emit, join_room, leave_room
from models import User, Message, Chat, ChatParticipant
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet") 
from utils.auth_utils import get_user_from_req"""


username_to_sid = {} 


@socketio.on('create_chat')
def create_chat(data):
    token = data.get('token')
    if not token:
        emit('error', {'message': 'Missing token'})
        return

    sender_user = get_user_from_token(token)  
    if not sender_user:
        emit('error', {'message': 'Invalid token'})
        return
    
    recipient_username = data['recipient_username']
    recipient_user = User.query.filter_by(username=recipient_username).first()

    if sender_user.id == recipient_user.id:
        emit('error', {'message': 'Recipient and sender have matching ids'})
        return

    sender_id = sender_user.id
    recipient_id = recipient_user.id

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
    else: 
        sender_participant = ChatParticipant.query.filter_by(chat_id=chat.id, user_id=sender_id).first()
        sender_participant.chat_active = True
        db.session.commit()

    room_name = chat.id
    
    join_room(room_name)

    emit('joined_room', {'room_name': room_name}, room=sender_id)
    emit('joined_room', {'room_name': room_name}, room=recipient_id)

    chat_details = get_all_active_chat_details_as_array(sender_user.id)
    new_chat_details = get_active_chat_details(chat.id, sender_user.id)

    emit('chat_created', {'chat_details': chat_details, 'new_chat': new_chat_details}, room=room_name)

@socketio.on('create_message')
def create_message(data):

    token = data.get('token')
    if not token:
        emit('error', {'message': 'Missing token'})
        return

    sender_user = get_user_from_token(token)  
    if not sender_user:
        emit('error', {'message': 'Invalid token'})
        return
    
    recipient_username = data['recipient_username']
    message_body = data['message_body']

    recipient_user = User.query.filter_by(username=recipient_username).first()

    chats_with_sender = Chat.query.join(ChatParticipant).filter(ChatParticipant.user_id == sender_user.id).all()
    chat = None
    for c in chats_with_sender:
        recipient_participant = ChatParticipant.query.filter_by(chat_id=c.id, user_id=recipient_user.id).first()
        if recipient_participant:
            recipient_participant.chat_active = True
            chat = c
            break

    db.session.add(Message(chat_id=chat.id, sender_id=sender_user.id, message_body=message_body, read=False))
    db.session.commit()  
    
    all_chat_details = get_all_active_chat_details_as_array(sender_user.id)

    new_chat_details = get_active_chat_details(chat.id, sender_user.id)

    new_message_details = {
        'message_body': message_body,
        'username': sender_user.username
    }

    room_name = chat.id
    recipient_sid = username_to_sid.get(recipient_username)

    if recipient_sid:
        join_room(room_name, sid=recipient_sid)

    join_room(room_name, sid=request.sid)

    emit('message_created',  {'all_chat_details': all_chat_details, 'new_chat_details': new_chat_details, 'new_message_details': new_message_details} , room=room_name)



from flask_socketio import join_room, emit
from utils.auth_utils import get_user_from_token
from chat import get_all_active_chat_details_as_array 

@socketio.on('join_chat_rooms')
def join_chat_rooms(data):
    token = data.get('token')
    if not token:
        emit('error', {'message': 'Missing token'})
        return

    user = get_user_from_token(token)  
    if not user:
        emit('error', {'message': 'Invalid token'})
        return

    username = user.username
    sid = request.sid
    username_to_sid[username] = sid

    chat_details = get_all_active_chat_details_as_array(user.id)

    room_ids = []
    for chat in chat_details:
        room_id = chat['chat_id'] 
        join_room(room_id)
        room_ids.append(room_id)

    emit('joined_chat_rooms', {'rooms': room_ids}, room=request.sid)




if __name__ == "__main__": 
    with app.app_context():
        db.create_all()
        seed_question_sets()
    socketio.run(app, debug=True, port=5000)