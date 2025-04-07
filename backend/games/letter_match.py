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

'''
ORIGINAL

import random
import string
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_cors import CORS
from setup.extensions import db
from models import (
    User, Game, Player, 
    question_LetterMatch as Question, 
    game_question_lettermatch,
    LetterMatch_Answers,
    playerAnswer_LetterMatch
    
)



letter_match_bp = Blueprint('letter_match', __name__)

#blueprint route >> creates game
@letter_match_bp.route("/create", methods=["POST"])
def create_letter_match():
    print("Creating game")
    data = request.get_json()
    print(f"Data received: {data}")

    # Input validation
    if not data or 'username' not in data or 'room' not in data:
        return jsonify({'error': 'Invalid input'}), 400

    username = data.get('username')
    print(f"Username: {username}")
    if not username:
        return jsonify({'error': 'Username is required'}), 400

    room = data.get("room")
    print(f"Room code: {room}")
    if not room:
        return jsonify({"error": "Room name is required"}), 400

    game_type = data.get("game_type", "LetterMatchOnline")
    time_limit = data.get("time_limit", 60)  # seconds, default 60
    player_names = data.get("player_names", [])
    creator_username = data.get("creator_username", None)

    # Check if room already exists
    existing_game = Game.query.filter_by(room=room, game_type=game_type).first()
    if existing_game:
        return jsonify({"error": "Game room already exists"}), 400

    # Create the new game
    new_game = Game(
        room=room,
        game_type=game_type,
        time_limit=time_limit,
        started=False,
    )
    db.session.add(new_game)
    db.session.commit()

    # If local game type, create players from player_names list
    if game_type == "LetterMatchLocal":
        if not player_names:
            return jsonify({"error": "player_names required for local games"}), 400
        
        for pname in player_names:
            if not pname.strip():
                return jsonify({"error": "Player names cannot be empty"}), 400

        for i, pname in enumerate(player_names):
            p = Player(
                username=pname,
                game_id=new_game.id,
                is_creator=(i == 0)  # First player is the creator
            )
            db.session.add(p)
        db.session.commit()

    # If online (or single-player), create the creator player
    if game_type == "LetterMatchOnline" or game_type == "LetterMatchSingle":
        # Check if creator_username is provided for online games
        if not creator_username:
            return jsonify({"error": "creator_username is required for this game mode"}), 400

        # Ensure the user exists in the database
        user = User.query.filter_by(username=creator_username).first()
        if not user:
            return jsonify({"error": f"User with username '{creator_username}' not found"}), 400

        # Create the player for the creator (first player)
        creator_player = Player(
            username=creator_username,
            game_id=new_game.id,
            is_creator=True,  # Mark as creator
            user_id=user.id   # Link the player to the user
        )
        db.session.add(creator_player)
        db.session.commit()

    return jsonify({
        "message": f"{game_type} game '{room}' created!",
        "game_id": new_game.id
    }), 201

'''
OLD CREATE
@letter_match_bp.route("/create", methods=["POST"])
def create_letter_match():

    #allows to create new game
    data = request.get_json()

    room = data.get("room")
    game_type = data.get("game_type", "LetterMatchOnline")
    time_limit = data.get("time_limit", 60)  # seconds, default 60
    player_names = data.get("player_names", [])
    creator_username = data.get("creator_username", None)

    #check for room name
    if not room:
        return jsonify({"error": "Room name is required"}), 400

    # Check if room already exists
    existing_game = Game.query.filter_by(room=room, game_type=game_type).first()
    if existing_game:
        return jsonify({"error": "Game room already exists"}), 400

    # Create the new game
    new_game = Game(
        room=room,
        game_type=game_type,
        time_limit=time_limit,
        started=False,
    )
    db.session.add(new_game)
    db.session.commit()


    # If local, directly create players from the passed list
    if game_type == "LetterMatchLocal":
        if not player_names:
            return jsonify({"error": "player_names required for local games"}), 400
        
        #checks the validity of player names
        for pname in player_names:
            if not pname.strip():
                return jsonify({"error": "Player names cannot be empty"}), 400
            

        for i, pname in enumerate(player_names):
            p = Player(
                username=pname,
                game_id=new_game.id,
                is_creator=(i == 0)  # The first name could be 'creator'
            )
            db.session.add(p)
        db.session.commit()

    # If online (also apply to single), create a single player (the creator), possibly the logged-in user
    if game_type == "LetterMatchOnline" or game_type =="LetterMatchSingle":

        #test check if the creator has a username
        if not creator_username:
            return jsonify({"error": "creator_username is required for this game mode"}), 400

        #does creator username exist in table?
        user = User.query.filter_by(username=creator_username).first()
        if not user:
            return jsonify({"error": f"User with username '{creator_username}' not found"}), 400


        #this will create the players (first player in game)
        creator_player = Player(
            username=creator_username,
            game_id=new_game.id,
            is_creator=True,  # Mark as creator
            user_id=user.id   # Link the player to a valid user
        )
        db.session.add(creator_player)
        db.session.commit()
        

    return jsonify({
        "message": f"{game_type} '{room}' created!",
        "game_id": new_game.id
    }), 201
'''

#for online players to join a game 
@letter_match_bp.route("/join", methods=["POST"])
def join_game():
 
    data = request.get_json()
    room = data.get("room")
    username = data.get("username")

    game = Game.query.filter_by(room=room, game_type="LetterMatchOnline").first()
    if not game:
        return jsonify({"error": "Game not found or not online type"}), 404

    if game.started:
        return jsonify({"error": "Game already started, cannot join"}), 400

    # Add player
    existing_player = Player.query.filter_by(game_id=game.id, username=username).first()
    if existing_player:
        return jsonify({"error": "You are already in this game"}), 400

    new_player = Player(username=username, game_id=game.id, is_creator=False)
    db.session.add(new_player)
    db.session.commit()

    return jsonify({"message": f"{username} joined game {room}"}), 200


#this will get the game going, grab a letter, have users answer questions
@letter_match_bp.route("/start", methods=["POST"])
def start_game():

    data = request.get_json()
    room = data.get("room")
    username = data.get("username")

    game = Game.query.filter_by(room=room).first()
    if not game:
        return jsonify({"error": "Game not found"}), 404

    # Check if the user is indeed the creator
    creator = Player.query.filter_by(game_id=game.id, username=username, is_creator=True).first()
    if not creator:
        return jsonify({"error": "Only the creator can start the game"}), 403

    if game.started:
        return jsonify({"error": "Game already started"}), 400

    # Mark as started, set the start time
    game.started = True
    game.start_time = datetime.utcnow()
    db.session.commit()


    Question = question_LetterMatch.query.all()
    
    #check if set exists 
    if not Question:
        return jsonify({"error": "Predefined question set not found"}), 404

  


    # For each question, assign a random letter
    # Save in game_question_lettermatch
    for q in Question:
        letter = random.choice(string.ascii_uppercase)
        gqb = game_question_lettermatch(

            game_id=game.id,
            question_id=q.id,
            letter=letter
        )
        db.session.add(gqb)
    db.session.commit()

    # Return the assigned questions/letters
    # We read them back from DB
    assigned = []
    for gqb in game.question_LetterMatch:
        # "gqb.question" now works because we added a relationship in the model
        assigned.append({
            "question_id": gqb.question_id,
            "prompt": gqb.question.prompt,
            "letter": gqb.letter
        })

    return jsonify({
        "message": f"Game '{room}' started!",
        "questions": assigned,
        "time_limit": game.time_limit
    }), 200

#builds questions and calculates time left
@letter_match_bp.route("/get_state", methods=["GET"])
def get_state():
    room = request.args.get("room")
    game = Game.query.filter_by(room=room).first()
    if not game:
        return jsonify({"error": "Game not found"}), 404

    players = Player.query.filter_by(game_id=game.id).all()

    # Build a list of assigned questions if the game has started
    assigned = []
    if game.started:
        for gqb in game.blitz_questions:
            assigned.append({
                "question_id": gqb.question_id,
                "prompt": gqb.question.prompt,
                "letter": gqb.letter
            })

    # Calculate time left
    time_left = None
    if game.started and game.start_time:
        elapsed = (datetime.utcnow() - game.start_time).total_seconds()
        remaining = game.time_limit - elapsed
        time_left = max(int(remaining), 0)

    # Return each player as {username, score}
    player_data = []
    for p in players:
        player_data.append({
            "username": p.username,
            "score": p.score  # <-- Now we include the player's actual score
        })

    return jsonify({
        "started": game.started,
        "players": player_data,
        "questions": assigned,
        "time_left": time_left
    }), 200

@letter_match_bp.route("/submit", methods=["POST"])
def submit_answer():
    """
    Submit a single answer (optional route).
    Expects:
    {
      "room": "MyOnlineRoom",
      "username": "SomeUser",
      "question_id": 123,
      "word": "Rhino"
    }
    """
    data = request.get_json()
    room = data.get("room")
    username = data.get("username")
    question_id = data.get("question_id")
    submitted_word = data.get("word", "").strip()

    game = Game.query.filter_by(room=room).first()
    if not game:
        return jsonify({"error": "Game not found"}), 404

    if not game.started:
        return jsonify({"error": "Game not started yet"}), 400

    # Check time remaining
    elapsed = (datetime.utcnow() - game.start_time).total_seconds() if game.start_time else 0
    if elapsed > game.time_limit:
        return jsonify({"error": "Time is up"}), 400

    # Check player
    player = Player.query.filter_by(game_id=game.id, username=username).first()
    if not player:
        return jsonify({"error": "You are not in this game"}), 403

    # Find the game_question_lettermatch row for the given question
    gqb = game_question_lettermatch.query.filter_by(game_id=game.id, question_id=question_id).first()
    if not gqb:
        return jsonify({"error": "Invalid question"}), 400

    # Validate if the word starts with the assigned letter
    if not submitted_word or submitted_word[0].upper() != gqb.letter.upper():
        return jsonify({"error": f"Answer must start with '{gqb.letter}'"}), 400
    
    word_correct = False
    if gqb.letter == submitted_word[0].upper():
        word_correct = True
        player.score += 10
    

    # Record the word in letter<atch
    new_word = playerAnswer_LetterMatch(
        word=submitted_word,
        game_id=game.id,
        username=username,
        question_id=question_id,
        word_correct=word_correct
    )
    db.session.add(new_word)

    # Simple scoring: +10 points
    db.session.commit()

    return jsonify({"message": "Answer accepted", "new_score": player.score}), 200

#submitt
@letter_match_bp.route("/submit_all", methods=["POST"])
def submit_all_answers():
    try:
        data = request.get_json()
        #print(f"Data: {data}")
        if not data:
            return jsonify({"error": "Invalid request format"}), 400

        room = data.get('room')
        username = data.get('username')
        answers = data.get('answers', {})
        #print(f"Answers: {answers}")

        if not room or not username or not isinstance(answers, dict):
            return jsonify({"error": "Missing or invalid fields"}), 400

        game = Game.query.filter_by(room=room).first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        if not game.started:
            return jsonify({"error": "Game not started yet"}), 400

        # Check if time limit is exceeded
        elapsed = (datetime.utcnow() - game.start_time).total_seconds() if game.start_time else 0
        if elapsed > game.time_limit:
            return jsonify({"error": "Time is up"}), 400

        # Verify player exists
        player = Player.query.filter_by(game_id=game.id, username=username).first()
        if not player:
            return jsonify({"error": "You are not in this game"}), 403

        results = {}
        for qid, word in answers.items():
            #print(f"Processing: {qid} => {word}")
            word = word.strip()

            gqb = game_question_lettermatch.query.filter_by(game_id=game.id, question_id=qid, ).first()
            if not gqb:
                results[qid] = {"word": word, "status": "❌ Invalid question"}
                print(f"Invalid question: {qid}")
                continue

            # Validate word starts with the required letter
            if not word or word[0].upper() != gqb.letter.upper():
                results[qid] = {"word": word, "status": f"❌ Must start with {gqb.letter}"}
                print(f"Invalid word: {word}")
                continue

            #checks w the correct answer from the LetterMatch_Answers table
            correct_answer = LetterMatch_Answers.query.filter_by(question_id=qid).first()
            is_correct = correct_answer and word.lower() == correct_answer.correct_answer.lower()

            # Save the valid answer
            new_word = playerAnswer_LetterMatch(
                game_id=game.id,
                player_id=player.id,
                question_id=qid,
                answer=word,
                is_correct=is_correct
            )
            db.session.add(new_word)

            # Update score if correct
            if is_correct:
                player.score += 10
                results[qid] = {"word": word, "status": "✅ Accepted"}
            else:
                results[qid] = {"word": word, "status": "❌ Incorrect"}

            

        db.session.commit()
        return jsonify({"message": "All answers submitted!", "results": results, "score": player.score}), 200

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": "Server error"}), 500
    
#list of online Letter Match Games not started yet
@letter_match_bp.route("/open_games", methods=["GET"])
def open_games():
    """
    Return a list of online letter match games that have NOT started yet.
    """
    try:
        games = Game.query.filter_by(game_type="LetterMatchOnline", started=False).all()
        game_list = []
        for g in games:
            players = [p.username for p in g.players]
            game_list.append({
                "room": g.room,
                "players": players,
                "game_id": g.id,
            })
        return jsonify({"open_games": game_list}), 200
    except Exception as e:
        print(e)
        return jsonify({"error": "Server error"}), 500

#ai evaluation of answers
@letter_match_bp.route("/all_answers", methods=["GET"])
def get_all_answers():
    """
    Return all letter_match rows for a given game_id,
    plus question prompt and the *latest* matching Answer row
    (which has AI correctness).
    """

    

    
    

    game_id = request.args.get("game_id", type=int)
    if not game_id:
        return jsonify({"error": "Missing game_id"}), 400

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": f"Game {game_id} not found"}), 404

    # Subquery: For each (game_id, question_id, user_id) in the Answer table,
    # find the row with the largest "id".
    latest_answers_subq = (
        db.session.query(
            playerAnswer_LetterMatch.game_id.label("sub_game_id"),
            playerAnswer_LetterMatch.question_id.label("sub_question_id"),
            playerAnswer_LetterMatch.user_id.label("sub_user_id"),
            func.max(playerAnswer_LetterMatch.id).label("max_answer_id")
        )
        .group_by(playerAnswer_LetterMatch.game_id, playerAnswer_LetterMatch.question_id, playerAnswer_LetterMatch.user_id)
        .subquery()
    )

    # Now join Letter_Match -> Question_LetterMatch -> User -> subquery -> Answer
    results_data = (
        db.session.query(
            Word,
            Question_LetterMatch,
            playerAnswer_LetterMatch
        )
        .join(
            Player,
            Word.username == Player.username
        )
        .join(
            Player,
            Word.username == Player.username
        )
        # Join our subquery on (game_id, question_id, user_id)
        .outerjoin(
            latest_answers_subq,
            and_(
                Word.game_id == latest_answers_subq.c.sub_game_id,
                Word.question_id == latest_answers_subq.c.sub_question_id,
                Player.id == latest_answers_subq.c.sub_user_id
            )
        )
        # Then join the actual Answer table on Answer.id == subquery.max_answer_id
        # (If subquery is None, a is None)
        .outerjoin(
            LetterMatch_Answers,
            LetterMatch_Answers.id==latest_answers_subq.c.max_answer_id
        )
        .filter(Word.game_id == game_id)
        .all()
    )

    final = []
    for (w, q, a) in results_data:
        # 'a' might be None if there's no matching Answer
        if a:
            ai_correct = a.ai_correct
            ai_result = a.ai_result
            vote_requested = a.vote_requested
            vote_yes = a.vote_yes
            vote_no = a.vote_no
            admin_override = a.admin_override
            override_value = a.override_value
            answer_id = a.id
        else:
            ai_correct = None
            ai_result = None
            vote_requested = False
            vote_yes = 0
            vote_no = 0
            admin_override = False
            override_value = None
            answer_id = None

        final.append({
            "id": w.id,
            "username": w.username,
            "questionId": w.question_id,
            "questionPrompt": q.prompt,
            "word": w.word,
            "word_correct": w.word_correct,

            # The single "latest" Answer row for this user+question+game
            "answerId": answer_id,
            "aiCorrect": ai_correct,
            "aiResult": ai_result,
            "voteRequested": vote_requested,
            "voteYes": vote_yes,
            "voteNo": vote_no,
            "adminOverride": admin_override,
            "overrideValue": override_value,
        })

    return jsonify({"answers": final}), 200
'''
