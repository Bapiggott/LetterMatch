import random
import string
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import (
    Game, Player, Word_blitz as Word, 
    Question_blitz as Question, QuestionSet_blitz as QuestionSet,
    GameQuestionBlitz
)

word_blitz_bp = Blueprint('word_blitz', __name__)

@word_blitz_bp.route("/create", methods=["POST"])
def create_word_blitz():
    """
    Create a WordBlitz game.
    Request JSON looks like:
    {
      "room": "MyLocalRoom",
      "game_type": "WordBlitzLocal" or "WordBlitzOnline",
      "player_names": ["Alice", "Bob"]   (only for local)
      "creator_username": "RealUser"     (only for online)
      "time_limit": 120                  (optional)
    }
    """
    data = request.get_json()
    room = data.get("room")
    game_type = data.get("game_type", "WordBlitzOnline")
    time_limit = data.get("time_limit", 60)  # seconds, default 60
    player_names = data.get("player_names", [])
    creator_username = data.get("creator_username", None)

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
    if game_type == "WordBlitzLocal":
        if not player_names:
            return jsonify({"error": "player_names required for local games"}), 400

        for i, pname in enumerate(player_names):
            p = Player(
                username=pname,
                game_id=new_game.id,
                is_creator=(i == 0)  # The first name could be 'creator'
            )
            db.session.add(p)
        db.session.commit()

    # If online, create a single player (the creator), possibly the logged-in user
    if game_type == "WordBlitzOnline":
        if not creator_username:
            return jsonify({"error": "creator_username is required for online games"}), 400

        creator_player = Player(
            username=creator_username,
            game_id=new_game.id,
            is_creator=True
        )
        db.session.add(creator_player)
        db.session.commit()

    return jsonify({
        "message": f"{game_type} '{room}' created!",
        "game_id": new_game.id
    }), 201


@word_blitz_bp.route("/join", methods=["POST"])
def join_game():
    """
    Online players can join an existing (not started) WordBlitzOnline game.
    {
      "room": "MyOnlineRoom",
      "username": "AnotherUser"
    }
    """
    data = request.get_json()
    room = data.get("room")
    username = data.get("username")

    game = Game.query.filter_by(room=room, game_type="WordBlitzOnline").first()
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


@word_blitz_bp.route("/start", methods=["POST"])
def start_game():
    """
    The creator can start the game. This will:
    1. Mark game as started
    2. Save start_time
    3. Randomly choose a question set
    4. Create GameQuestionBlitz entries (question + random letter)
    5. Return the questions and letters to the client
    {
      "room": "MyOnlineRoom",
      "username": "RealCreator"
    }
    """
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

    # Pick a random question set
    question_sets = QuestionSet.query.all()
    if not question_sets:
        return jsonify({"error": "No question sets available"}), 500

    selected_set = random.choice(question_sets)
    questions = Question.query.filter_by(question_set_id=selected_set.id).all()

    # For each question, assign a random letter
    # Save in GameQuestionBlitz
    for q in questions:
        letter = random.choice(string.ascii_uppercase)
        gqb = GameQuestionBlitz(
            game_id=game.id,
            question_id=q.id,
            letter=letter
        )
        db.session.add(gqb)
    db.session.commit()

    # Return the assigned questions/letters
    # We read them back from DB
    assigned = []
    for gqb in game.blitz_questions:
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


@word_blitz_bp.route("/get_state", methods=["GET"])
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



@word_blitz_bp.route("/submit", methods=["POST"])
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

    # Find the GameQuestionBlitz row for the given question
    gqb = GameQuestionBlitz.query.filter_by(game_id=game.id, question_id=question_id).first()
    if not gqb:
        return jsonify({"error": "Invalid question"}), 400

    # Validate if the word starts with the assigned letter
    if not submitted_word or submitted_word[0].upper() != gqb.letter.upper():
        return jsonify({"error": f"Answer must start with '{gqb.letter}'"}), 400
    
    letters = GameQuestionBlitz.query.filter_by(game_id=game.id, question_id=question_id).first()
    if not letters:
        return jsonify({"error": "Invalid question"}), 400
    if letters.letter != submitted_word[0].upper():
       print(f"Answer must start with '{letters.letter}'")
       word_correct = False
    else:
        word_correct = True
        player.score += 10
    

    # Record the word in Word_blitz
    new_word = Word(
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

@word_blitz_bp.route("/submit_all", methods=["POST"])
def submit_all_answers():
    """
    Handles bulk submission of answers.
    Expected JSON format:
    {
      "room": "RoomName",
      "username": "Username",
      "answers": {
          "question_id1": "response1",
          "question_id2": "response2",
          ...
      }
    }
    """
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

            gqb = GameQuestionBlitz.query.filter_by(game_id=game.id, question_id=qid).first()
            if not gqb:
                results[qid] = {"word": word, "status": "❌ Invalid question"}
                print(f"Invalid question: {qid}")
                continue

            # Validate word starts with the required letter
            """if not word or word[0].upper() != gqb.letter.upper():
                results[qid] = {"word": word, "status": f"❌ Must start with {gqb.letter}"}
                print(f"Invalid word: {word}")
                continue"""

            # Save the valid answer
            new_word = Word(
                word=word,
                game_id=game.id,
                username=username,
                question_id=qid
            )
            db.session.add(new_word)

            # Update score
            player.score += 10
            results[qid] = {"word": word, "status": "✅ Accepted"}
            #print(f"Accepted: {word}")

        db.session.commit()
        return jsonify({"message": "All answers submitted!", "results": results, "score": player.score}), 200

    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({"error": "Server error"}), 500
"""
@word_blitz_bp.route("/submit_all", methods=["POST"])
def submit_all_answers():
    '''
    If your UI collects all answers at once, do it in bulk.
    {
      "room": "MyOnlineRoom",
      "username": "SomeUser",
      "answers": {
          question_id1: "word1",
          question_id2: "word2",
          ...
      }
    }
    '''
    try:
        data = request.get_json()
        print(data)
        room = data.get('room')
        username = data.get('username')
        answers = data.get('answers', {})

        game = Game.query.filter_by(room=room).first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        if not game.started:
            return jsonify({"error": "Game not started yet"}), 400

        # Check time
        elapsed = (datetime.utcnow() - game.start_time).total_seconds() if game.start_time else 0
        if elapsed > game.time_limit:
            return jsonify({"error": "Time is up"}), 400

        # Check player
        player = Player.query.filter_by(game_id=game.id, username=username).first()
        if not player:
            return jsonify({"error": "You are not in this game"}), 403

        results = {}
        for qid, word in answers.items():
            word = word.strip()
            gqb = GameQuestionBlitz.query.filter_by(game_id=game.id, question_id=qid).first()
            if not gqb:
                results[qid] = {"word": word, "status": "❌ Invalid question"}
                continue

            if not word or word[0].upper() != gqb.letter.upper():
                results[qid] = {"word": word, "status": f"❌ Must start with {gqb.letter}"}
                continue

            # Save valid answer
            new_word = Word(
                word=word,
                game_id=game.id,
                username=username,
                question_id=qid
            )
            db.session.add(new_word)

            # Score
            player.score += 10
            results[qid] = {"word": word, "status": "✅ Accepted"}

        db.session.commit()
        return jsonify({"message": "All answers submitted!", "results": results, "score": player.score}), 200

    except Exception as e:
        print(e)
        return jsonify({"error": "Server error"}), 500"""

@word_blitz_bp.route("/add_questions", methods=["POST"])
def add_questions():
    """
    Add a new custom question set with exactly 10 questions (or any size you want).
    {
      "set_name": "MyCustomSet",
      "questions": ["Question 1 prompt", "Question 2 prompt", ...]
    }
    """
    try:
        data = request.get_json()
        set_name = data.get('set_name')
        questions = data.get('questions', [])

        if not set_name or len(questions) != 10:
            return jsonify({"error": "Set name and exactly 10 questions required"}), 400

        new_set = QuestionSet(name=set_name)
        db.session.add(new_set)
        db.session.commit()

        for prompt in questions:
            db.session.add(Question(prompt=prompt, question_set_id=new_set.id))

        db.session.commit()
        return jsonify({"message": f"Custom question set '{set_name}' added!"}), 201

    except Exception as e:
        print(e)
        return jsonify({"error": "Server error"}), 500


@word_blitz_bp.route("/open_games", methods=["GET"])
def open_games():
    """
    Return a list of online WordBlitz games that have NOT started yet.
    """
    try:
        games = Game.query.filter_by(game_type="WordBlitzOnline", started=False).all()
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


@word_blitz_bp.route("/add_questions1", methods=["POST"])
def add_questions1():
    try:
        data = request.get_json()
        set_name = data.get('set_name')
        questions = data.get('questions', [])

        if not set_name or len(questions) != 10:
            return jsonify({"error": "Set name and exactly 10 questions required"}), 400

        new_set = QuestionSet(name=set_name)
        db.session.add(new_set)
        db.session.commit()

        for prompt in questions:
            db.session.add(Question(prompt=prompt, question_set_id=new_set.id))

        db.session.commit()
        return jsonify({"message": f"Custom question set '{set_name}' added!"}), 201

    except Exception as e:
        return jsonify({"error": "Server error"}), 500
""'''# word_blitz_bp.py (or somewhere else)
@word_blitz_bp.route("/all_answers", methods=["GET"])
def get_all_answers():
    """
    Return all Word_blitz rows for a given game, 
    along with question prompt if needed.
    Expects:
      GET /word_blitz/all_answers?room=MyOnlineRoom
    """
    room = request.args.get("room")
    game = Game.query.filter_by(room=room).first()
    if not game:
        #print("Game not found")
        return jsonify({"error": "Game not found"}), 404

    # Join Word_blitz with the question prompt
    # (You have `question_id` referencing `Question_blitz.id`).
    from models import Word_blitz, Question_blitz

    all_words = db.session.query(Word_blitz, Question_blitz).join(
        Question_blitz, Word_blitz.question_id == Question_blitz.id
    ).filter(Word_blitz.game_id == game.id).all()

    results = []
    #print(all_words)
    for (w, q) in all_words:
        print(w, q)
        results.append({
            "id": w.id,
            "username": w.username,
            "questionId": w.question_id,
            "questionPrompt": q.prompt,
            "word": w.word,
            # you might also include w.word_correct or any other fields
        })
        #print(results)
    return jsonify({"answers": results}), 200'''""

'''@word_blitz_bp.route("/all_answers", methods=["GET"])
def get_all_answers():
    """
    Return all Word_blitz rows for a given game_id,
    plus the question prompt if needed.

    Expects:
      GET /word_blitz/all_answers?game_id=123
    """
    game_id = request.args.get("game_id", type=int)
    if not game_id:
        return jsonify({"error": "Missing game_id parameter"}), 400

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": f"Game {game_id} not found"}), 404

    from models import Word_blitz, Question_blitz

    # Now just query by game_id
    all_words = (
        db.session.query(Word_blitz, Question_blitz)
        .join(Question_blitz, Word_blitz.question_id == Question_blitz.id)
        .filter(Word_blitz.game_id == game.id)
        .all()
    )

    results = []
    for (w, q) in all_words:
        results.append({
            "id": w.id,
            "username": w.username,
            "questionId": w.question_id,
            "questionPrompt": q.prompt,
            "word": w.word,
            "word_correct": w.word_correct,
        })

    return jsonify({"answers": results}), 200'''
@word_blitz_bp.route("/all_answers", methods=["GET"])
def get_all_answers():
    """
    Return all Word_blitz rows for a given game_id,
    plus question prompt and the *latest* matching Answer row
    (which has AI correctness, votes, etc.).
    """
    from sqlalchemy import and_, func
    from models import Game, Word_blitz, Question_blitz, Answer, User

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
            Answer.game_id.label("sub_game_id"),
            Answer.question_id.label("sub_question_id"),
            Answer.user_id.label("sub_user_id"),
            func.max(Answer.id).label("max_answer_id")
        )
        .group_by(Answer.game_id, Answer.question_id, Answer.user_id)
        .subquery()
    )

    # Now join Word_blitz -> Question_blitz -> User -> subquery -> Answer
    results_data = (
        db.session.query(
            Word_blitz,
            Question_blitz,
            Answer
        )
        .join(
            Question_blitz,
            Word_blitz.question_id == Question_blitz.id
        )
        .join(
            User,
            Word_blitz.username == User.username
        )
        # Join our subquery on (game_id, question_id, user_id)
        .outerjoin(
            latest_answers_subq,
            and_(
                Word_blitz.game_id == latest_answers_subq.c.sub_game_id,
                Word_blitz.question_id == latest_answers_subq.c.sub_question_id,
                User.id == latest_answers_subq.c.sub_user_id
            )
        )
        # Then join the actual Answer table on Answer.id == subquery.max_answer_id
        # (If subquery is None, a is None)
        .outerjoin(
            Answer,
            Answer.id == latest_answers_subq.c.max_answer_id
        )
        .filter(Word_blitz.game_id == game_id)
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
