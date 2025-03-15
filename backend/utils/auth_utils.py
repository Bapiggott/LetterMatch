from flask import Request, current_app
import jwt
from models import User

def get_user_from_req(req: Request) -> User:
    """
    Returns: 
        A user object representing the user that sent the request.
    """

    token_bearer_str = req.headers.get("Authorization")

    if not token_bearer_str:
        return None
    
    token = token_bearer_str.split(" ")[1]  # Remove "Bearer " prefix
    decoded_token = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
    user = User.query.get(decoded_token['user_id'])

    return user