import random
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from setup.extensions import db
from models import (
    Game,
    Player,
    game_question_lettermatch,
    question_LetterMatch,
    playerAnswer_LetterMatch,
    letterMatch_answers,
)

letter_match_bp = Blueprint('letter_match', __name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#to validate the player's answer is correct
def validate_answer(question_id, player_answer):
    # Get all valid answers for the question/category
    correct_answers = letterMatch_answers.query.filter_by(category_id=question_id).all()

    # creates correct answer set in uppercase
    correct_answers_set = {a.answer.lower() for a in correct_answers}

    # check if player answer = correct answer in db
    return player_answer.strip().lower() in correct_answers_set



def prompt_to_category(prompt):
    """
    Example mapper from question_LetterMatch.prompt
    to the category ids
    """
    mapping = {
        'Name': 'Names',
        'Animals': 'Animals',
        'Objects': 'Objects',
        'Cities or Countries': 'Cities_or_Countries',
        'Foods': 'Foods',
    }
    return mapping.get(prompt, None)


@letter_match_bp.route('/test', methods=['GET'])
def test_connection():
    logger.info("Test connection endpoint hit")
    return jsonify({
        'message': 'Backend connection successful!',
        'status': 'OK'
    }), 200


@letter_match_bp.route('/create', methods=['POST'])
def create_game():
    data = request.get_json() or {}
    room = data.get('room')
    game_type = data.get('game_type')
    time_limit = data.get('time_limit', 60)

    if not room or not game_type:
        return jsonify({'error': 'Missing room or game_type'}), 400

    # Check if room already exists
    existing = Game.query.filter_by(room=room).first()
    if existing:
        return jsonify({'error': 'Room name already taken'}), 400

    # Create game
    game = Game(room=room, game_type=game_type, time_limit=time_limit)
    db.session.add(game)
    db.session.flush()  # get game ID

    try:
        if game_type == "LetterMatchSingle":
            # single-player has 1 real user + 1 AI "bot"
            username = data.get('username', 'SinglePlayer')
            p1 = Player(username=username, game_id=game.id, is_creator=True, score=0)
            db.session.add(p1)

            ai_bot = Player(username="Roberto_the_Robot", game_id=game.id, score=0)
            db.session.add(ai_bot)

        elif game_type == "LetterMatchLocal":
            names = data.get('player_names', [])
            if not names:
                db.session.rollback()
                return jsonify({'error': 'Must provide local player names'}), 400
            # First name is creator
            for i, nm in enumerate(names):
                p = Player(username=nm, game_id=game.id, is_creator=(i==0), score=0)
                db.session.add(p)

        elif game_type == "LetterMatchOnline":
            creator_username = data.get('creator_username')
            if not creator_username:
                db.session.rollback()
                return jsonify({'error': 'Missing creator_username'}), 400
            p = Player(username=creator_username, game_id=game.id, is_creator=True, score=0)
            db.session.add(p)
        else:
            db.session.rollback()
            return jsonify({'error': 'Invalid game_type'}), 400

        db.session.commit()
        return jsonify({
            'message': f'{game_type} created',
            'room': room,
            'game_id': game.id,
            'time_limit': time_limit
        })
    except Exception as e:
        logger.error("Error creating game", exc_info=True)
        db.session.rollback()
        return jsonify({'error': 'Server error while creating game'}), 500


@letter_match_bp.route('/join', methods=['POST'])
def join_game():
    data = request.get_json() or {}
    username = data.get('username')
    room = data.get('room')

    if not username or not room:
        return jsonify({'error': 'Username and room are required'}), 400

    game = Game.query.filter_by(room=room).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    # Check if player already in game
    existing = Player.query.filter_by(game_id=game.id, username=username).first()
    if existing:
        # they are rejoining
        return jsonify({'message': 'Rejoined game','room': room,'game_id': game.id})

    # otherwise add them
    p = Player(username=username, game_id=game.id, score=0)
    db.session.add(p)
    db.session.commit()

    return jsonify({
        'message': 'Joined game',
        'room': room,
        'game_id': game.id
    })


@letter_match_bp.route('/start', methods=['POST'])
def start_game():
    data = request.get_json() or {}
    room = data.get('room')
    username = data.get('username')
    chosen_letter = data.get('letter')  # Might be None or "random"
    round_count = data.get('rounds', 5) #set to 5 to display 5 questions

    if not room or not username:
        return jsonify({'error': 'Missing room or username'}), 400

    # If letter is None or "random", pick a random
    if not chosen_letter or str(chosen_letter).lower() == 'random':
        chosen_letter = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

    game = Game.query.filter_by(room=room).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    # Must be the creator to start
    creator = Player.query.filter_by(game_id=game.id, is_creator=True).first()
    if not creator or creator.username != username:
        return jsonify({'error': 'Only creator can start'}), 403

    try:
        # remove existing associations if any
        game_question_lettermatch.query.filter_by(game_id=game.id).delete()

        # fetch questions
        questions = question_LetterMatch.query.order_by(func.random()).limit(round_count).all()
        if not questions:
            return jsonify({'error': 'No letter-match questions in DB'}), 400

        # create associations
        for q in questions:
            gq = game_question_lettermatch(
                game_id=game.id,
                question_id=q.id,
                letter=chosen_letter
            )
            db.session.add(gq)

        game.started = True
        game.start_time = datetime.utcnow()
        db.session.commit()

        # Return them as {question_id, prompt, letter}
        output_questions = []
        for q in questions:
            output_questions.append({
                'question_id': q.id,
                'prompt': q.prompt,
                'letter': chosen_letter
            })

        # also return players + scores
        players = Player.query.filter_by(game_id=game.id).all()
        player_data = []
        for p in players:
            player_data.append({
                'username': p.username,
                'score': p.score,
                'is_creator': p.is_creator
            })

        return jsonify({
            'message': 'Game started',
            'letter': chosen_letter,
            'questions': output_questions,
            'game_id': game.id,
            'players': player_data
        })
    except Exception as e:
        logger.error("Error starting game", exc_info=True)
        db.session.rollback()
        return jsonify({'error': 'Server error while starting game'}), 500


@letter_match_bp.route('/get_state', methods=['GET'])
def get_state():
    room = request.args.get('room')
    if not room:
        return jsonify({'error': 'Room is required'}), 400

    game = Game.query.filter_by(room=room).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    if game.started and game.start_time:
        elapsed = (datetime.utcnow() - game.start_time).total_seconds()
        game_ended = elapsed >= game.time_limit
    else:
        game_ended = False

    # sorts by score when game is over
    if game_ended:
        players = Player.query.filter_by(game_id=game.id).order_by(Player.score.desc()).all()
    else:
        players = Player.query.filter_by(game_id=game.id).order_by(Player.id).all()

    player_data = []
    for p in players:
        player_data.append({
            'username': p.username,
            'score': p.score
        })

    # Gather questions
    gq_list = game_question_lettermatch.query.filter_by(game_id=game.id).all()
    questions_data = []
    for gq in gq_list:
        q_obj = question_LetterMatch.query.get(gq.question_id)
        if q_obj:
            questions_data.append({
                'question_id': q_obj.id,
                'prompt': q_obj.prompt,
                'letter': gq.letter
            })

    # Time left
    time_left = 0
    if game.start_time and game.time_limit:
        elapsed = (datetime.utcnow() - game.start_time).total_seconds()
        if elapsed < game.time_limit:
            time_left = int(game.time_limit - elapsed)
        else:
            time_left = 0

    return jsonify({
        'started': game.started,
        'players': player_data,
        'questions': questions_data,
        'time_left': time_left
         
    })


@letter_match_bp.route('/open_games', methods=['GET'])
def open_games():
    # Return all LetterMatchOnline games that have not started yet
    games = Game.query.filter_by(started=False, game_type='LetterMatchOnline').all()
    result = []


    for g in games:
        p_list = Player.query.filter_by(game_id=g.id).all()
        players = [p.username for p in p_list]
        result.append({
            'game_id': g.id,
            'room': g.room,
            'players': players
        })
    return jsonify({'open_games': result})


@letter_match_bp.route("/submit_all", methods=["POST"])
def submit_all_answers():
    """
    Expects:
    {
      "room": "MyRoom",
      "username": "SomeUser",
      "answers": {
         "question_id": "typed answer",
         "question_id2": "typed answer2"
      }
    }
    """
    print("Submit all answers endpoint hit")
    data = request.get_json() or {}
    room = data.get("room")
    username = data.get("username")
    answers_map = data.get("answers")

    if not room or not username or not answers_map:
        return jsonify({'error': 'Missing room/username/answers'}), 400

    game = Game.query.filter_by(room=room).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    player = Player.query.filter_by(game_id=game.id, username=username).first()
    if not player:
        print(f"Player {username} not found in game {room}")
        return jsonify({'error': 'Player not found in this game'}), 404

    # Time check
    elapsed = (datetime.utcnow() - game.start_time).total_seconds() if game.start_time else 0
    if elapsed > game.time_limit:
        print(f"Time is up for {username}. Elapsed: {elapsed:.2f}s")

        # Optional: Mark timeout somehow if needed, like setting a flag

        # Handle next person's turn
        if game.game_type == "LetterMatchLocal":
            #get all players by join order
            players = Player.query.filter_by(game_id=game.id).order_by(Player.id).all()

            #gets current index of player
            current_index = next((i for i, p in enumerate(players) if p.username == username), 0)

            #gets index of next player
            next_index = (current_index + 1) % len(players)
            game.current_turn = next_index #assigns next player to current player

            game.start_time = datetime.utcnow() #reset time for new playeer
            db.session.commit()

        return jsonify({
            "message": "⏰ Time is up! No answers recorded.",
            "results": {},
            "score": player.score
        }), 200

    results = {}
    try:
        for qid_str, word in answers_map.items():
            if not word:
                continue

            qid = int(qid_str)
            gqb = game_question_lettermatch.query.filter_by(game_id=game.id, question_id=qid).first()
            if not gqb:
                results[qid_str] = {"word": word, "status": "❌ Invalid question"}
                continue

            if word[0].upper() != gqb.letter.upper():
                results[qid_str] = {"word": word, "status": f"❌ Must start with {gqb.letter}"}
                continue

            #inserttt
            required_letter = gqb.letter
            is_correct = False
            score = 0

            if word[0].upper() != required_letter.upper():
                status_msg = f"❌ Must start with {required_letter}"
            else:
                if validate_answer(qid, word):
                    is_correct = True
                    score = 10
                    status_msg = "✅ Accepted"
                else:
                    status_msg = "❌ Not a valid answer"

            # Save answer with correct validation
            new_ans = playerAnswer_LetterMatch(
                game_id=game.id,
                player_id=player.id,
                question_id=qid,
                answer=word,
                is_correct=is_correct
            )
            db.session.add(new_ans)

            player.score += score
            results[qid_str] = {"word": word, "status": status_msg}

            db.session.commit()

            if game.game_type == "LetterMatchLocal":
                players = Player.query.filter_by(game_id=game.id).order_by(Player.id).all()
                current_index = next((i for i, p in enumerate(players) if p.username == username), 0)
                next_index = (current_index + 1) % len(players)
                game.current_turn = next_index
                game.start_time = datetime.utcnow()
                db.session.commit()

        return jsonify({
            "message": "All answers submitted!",
            "results": results,
            "score": player.score
        }), 200

    except Exception as e:
        logger.error("Error in submit_all", exc_info=True)
        db.session.rollback()
        return jsonify({"error": "Server error"}), 500


@letter_match_bp.route('/all_answers', methods=['GET'])
def all_answers():
    """
    Query param: game_id
    Returns all answers from playerAnswer_LetterMatch
    """
    game_id = request.args.get('game_id')
    if not game_id:
        return jsonify({'error': 'game_id is required'}), 400

    game = Game.query.get(game_id)
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    answers = playerAnswer_LetterMatch.query.filter_by(game_id=game.id).all()
    out = []
    for ans in answers:
        player_obj = Player.query.get(ans.player_id)
        q_obj = question_LetterMatch.query.get(ans.question_id)
        out.append({
            'player': player_obj.username if player_obj else "Unknown",
            'question': q_obj.prompt if q_obj else "Unknown",
            'answer': ans.answer,
            'is_correct': ans.is_correct,
            'timestamp': ans.answer_time.isoformat() if ans.answer_time else None,
        })
    return jsonify({'answers': out})