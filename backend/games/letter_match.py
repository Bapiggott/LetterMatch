from flask import Blueprint, request, jsonify
from models import Game, User, question_LetterMatch, playerAnswer_LetterMatch
import random
from sqlalchemy import func
from setup.extensions import db

letter_match_bp = Blueprint('letter_match', __name__)

# utils.py or helpers.py

def validate_word(word, letter):
    # Ensure the word starts with the chosen letter
    if not word.lower().startswith(letter.lower()):
        return False

    # Optionally, check if the word is valid in a dictionary or word list
    if len(word) < 3:  # Example rule: Word must be at least 3 characters
        return False

    return True

def calculate_score(word, is_valid):
    if not is_valid:
        return 0  # No score for invalid words

    # Example scoring system: Length of the word as score
    score = len(word)  # Points based on word length
    return score


@letter_match_bp.route('/create', methods=['POST'])
def create_game():
    print("Creating game")
    data = request.get_json()

    # Check if data is valid
    if not data:
        print("No data received")
        return jsonify({'error': 'No JSON data received'}), 400

    print(f"Data received: {data}")
    if 'username' not in data or 'room_code' not in data:
        print("Missing 'username' or 'room_code' in the data")
        return jsonify({'error': 'Invalid input'}), 400
    
    username = data.get('username')
    room_code = data.get('room_code')

    if not username:
        print("Missing 'username'")
        return jsonify({'error': 'Username is required'}), 400
    
    if not room_code:
        print("Missing 'room_code'")
        return jsonify({'error': 'Room code is required'}), 400
    
    user = User(username=username)
    game = Game(room_code=room_code)
    game.players.append(user)
    db.session.add(game)
    db.session.commit()

    return jsonify({'message': 'Game created', 'room_code': room_code, 'user_id': user.id, 'game_id': game.id})
    
    

#    user = User(username=username)
#    print(f"User created: {user}")

#    try:
#        db.session.add(user)
#        db.session.commit()
#    except Exception as e:
#       print(f"Error during user commit: {str(e)}")
#    db.session.rollback()
#     return jsonify({'error': 'Error creating user'}), 500

#    game = Game(room_code=room_code)
#    try:
#        db.session.add(game)
#        db.session.commit()
#    except Exception as e:
#        print(f"Error during game commit: {str(e)}")
#        db.session.rollback()
#        return jsonify({'error': 'Error creating game'}), 500

#    game.players.append(user)
#    db.session.commit()

#    print(f"Game created with room code: {room_code}")
#    return jsonify({'message': 'Game created', 'room_code': room_code, 'user_id': user.id, 'game_id': game.id})

@letter_match_bp.route('/join', methods=['POST'])
def join_game():
    data = request.get_json()
    username = data.get('username')
    room_code = data.get('room_code')

    game = Game.query.filter_by(room_code=room_code).first()
    if not game:
        return jsonify({'message': 'Game not found'}), 404

    user = User(username=username)
    db.session.add(user)
    db.session.commit()

  #  game.players.append(user)
   # db.session.commit()

    return jsonify({'message': 'Joined game', 'room_code': room_code, 'user_id': user.id, 'game_id': game.id})

@letter_match_bp.route('/start', methods=['POST'])
def start_game():
    data = request.get_json()
    room_code = data.get('room_code')
    chosen_letter = data.get("letter")

    game = Game.query.filter_by(room_code=room_code).first()
    if not game:
        return jsonify({'message': 'Game not found'}), 404

    if not chosen_letter:
        chosen_letter = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

    game.letter = chosen_letter
    game.state = 'playing'
    db.session.commit()

    return jsonify({'message': 'Game started', 'letter': chosen_letter})

@letter_match_bp.route('/submit_all', methods=['POST'])
def submit_all_answers():
    data = request.get_json()
    user_id = data.get('user_id')
    game_id = data.get('game_id')
    round_number = data.get('round')
    answers = data.get('answers') 

    game = Game.query.filter_by(id=game_id).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    
    available_letters = game.letter

    for category_id, answer_text in answers.items():
        # word validation
        is_valid = validate_word(answer_text, available_letters)
        #score
        score = calculate_score(answer_text, is_valid)

    #for category_id, answer_text in answers.items():
    new_answer = playerAnswer_LetterMatch(
        user_id=user_id,
        game_id=game_id,
        round=round_number,
        question_id=int(category_id),
        answer=answer_text,
        is_valid=is_valid,
        score=score
    )
    db.session.add(new_answer)

    db.session.commit()
    return jsonify({'message': 'All answers submitted successfully'})

@letter_match_bp.route('/get_state', methods=['GET'])
def get_game_state():
    room_code = request.args.get('room_code')
    game = Game.query.filter_by(room_code=room_code).first()
    if not game:
        return jsonify({'message': 'Game not found'}), 404

    players = [{'id': p.id, 'username': p.username} for p in game.players]
    letter = game.letter
    categories = [{'id': q.id, 'category': q.category} for q in question_LetterMatch.query.all()]

    return jsonify({'players': players, 'letter': letter, 'categories': categories})

@letter_match_bp.route('/get_all_answers', methods=['GET'])
def get_all_answers():
    game_id = request.args.get("game_id")
    round_number = request.args.get("round")

    # Get latest answer per user per question
    subquery = (
        db.session.query(
            playerAnswer_LetterMatch.user_id,
            playerAnswer_LetterMatch.question_id,
            func.max(playerAnswer_LetterMatch.id).label("max_id")
        )
        .filter_by(game_id=game_id, round=round_number)
        .group_by(playerAnswer_LetterMatch.user_id, playerAnswer_LetterMatch.question_id)
        .subquery()
    )

    latest_answers = (
        db.session.query(playerAnswer_LetterMatch, User.username, question_LetterMatch.category)
        .join(subquery, playerAnswer_LetterMatch.id == subquery.c.max_id)
        .join(User, User.id == playerAnswer_LetterMatch.user_id)
        .join(question_LetterMatch, playerAnswer_LetterMatch.question_id == question_LetterMatch.id)
        .all()
    )

    response = {}
    for answer, username, category in latest_answers:
        if username not in response:
            response[username] = []
        response[username].append({
            "category": category,
            "answer": answer.answer,
            "is_ai_valid": answer.is_ai_valid
        })

    return jsonify(response)