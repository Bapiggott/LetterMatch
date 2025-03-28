import traceback
from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import User, Message, Chat, ChatParticipant
from utils.auth_utils import get_user_from_req

chat_bp = Blueprint('chat', __name__)


@chat_bp.route("/get-chats", methods=["GET"])
def get_chats():
    """
    Right now only up to 99 messages from each chat are returned.
    """
    user = get_user_from_req(request)
    user_id = user.id

    chat_details = get_all_active_chat_details_as_array(user_id)

    return jsonify(chat_details)


def get_all_active_chat_details_as_array(end_user_id):
    chat_activity = ChatParticipant.query.filter((ChatParticipant.user_id == end_user_id) & (ChatParticipant.chat_active == True)).all()

    chat_details = []

    for activity in chat_activity:
        chat_id = activity.chat_id
        chat_details.append(get_active_chat_details(chat_id, end_user_id))
    return chat_details



def get_active_chat_details(chat_id, end_user_id):
    other_user = ChatParticipant.query.filter(ChatParticipant.chat_id == chat_id, ChatParticipant.user_id != end_user_id).first()
    other_username = User.query.get(other_user.user_id).username
    recent_messages = Message.query.filter(Message.chat_id == chat_id).order_by(Message.id.desc()).limit(99).all()
    unread_messages = 0
    messages = []
    for message in recent_messages:
        if message.read == False and int(message.sender_id) != int(end_user_id):
            unread_messages += 1
        sender = User.query.get(message.sender_id) 
        messages.append({
            'message_id': message.id,
            'message_body': message.message_body,
            'username': sender.username,
            'read': message.read,
        })
    return {
        'chat_id': chat_id,
        'username': other_username,
        'messages': messages,
        'unread_message_count': unread_messages
    }


@chat_bp.route('/remove-chat', methods=['POST'])
def remove_chat():
    user = get_user_from_req(request)
    user_id = user.id

    data = request.get_json() 
    chat_id = data.get("chat_id")

    participant = ChatParticipant.query.filter_by(chat_id=chat_id, user_id=user_id).first()

    participant.chat_active = False
    db.session.commit()

    return jsonify({"message": "Successfully deactivated chat"})

@chat_bp.route('/mark-chat-read', methods=['POST'])
def mark_read_chat():
    user = get_user_from_req(request)
    user_id = user.id
    data = request.get_json() 
    chat_id = data.get("chat_id")

    messages = Message.query.filter_by(chat_id=chat_id, read=False).all()
    if len(messages) > 0:
        for message in messages:
            if message.sender_id != user_id:
                message.read = True
        db.session.commit()

    return jsonify({"message": "Successfully marked messages as read"})

