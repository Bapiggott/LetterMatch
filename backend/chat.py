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

    chat_activity = ChatParticipant.query.filter((ChatParticipant.user_id == user_id) & (ChatParticipant.chat_active == True)).all()

    chat_details = []

    for activity in chat_activity:
        chat_id = activity.chat_id
        other_user = ChatParticipant.query.filter(ChatParticipant.chat_id == chat_id, ChatParticipant.user_id != user_id).first()
        other_username = User.query.get(other_user.id).username
        recent_messages = Message.query.filter(Message.chat_id == chat_id).order_by(Message.id.desc()).limit(99).all()
        number_of_unread_message = 0
        messages = []
        for message in recent_messages:
            if message.read == False:
                number_of_unread_message = number_of_unread_message + 1
            sender = User.query.get(message.sender_id) 
            messages.append({
                'message_body': message.message_body,
                'username': sender.username,
                'read': message.read
            })

    chat_details.append({
            'chat_id': chat_id,
            'username': other_username,
            'messages': messages,
            'number_of_unread_messsages': number_of_unread_message
        })
    return jsonify(chat_details)



