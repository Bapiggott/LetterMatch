from flask import Blueprint

letter_match_bp = Blueprint('letter_match', __name__)

@letter_match_bp.route('/')
def home():
    return "Letter Match Game Home"
