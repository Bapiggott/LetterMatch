import random
import string
from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import Game, Player, Word_blitz as Word, Question_blitz as Question, QuestionSet_blitz as QuestionSet

word_blitz_bp = Blueprint('word_blitz', __name__)

@word_blitz_bp.route("/create", methods=["POST"])
def create_word_blitz():
    try:
        data = request.get_json()
        room = data['room']

        existing_game = Game.query.filter_by(room=room, game_type="WordBlitz").first()
        if existing_game:
            return jsonify({"error": "Game room already exists"}), 400

        new_game = Game(room=room, game_type="WordBlitz")
        db.session.add(new_game)
        db.session.commit()

        # Select a random question set
        question_sets = QuestionSet.query.all()
        selected_set = random.choice(question_sets)

        # Assign a random letter for each question
        questions = Question.query.filter_by(question_set_id=selected_set.id).all()
        randomized_questions = [
            {"id": q.id, "prompt": q.prompt, "letter": random.choice(string.ascii_uppercase)}
            for q in questions
        ]

        return jsonify({"message": f"WordBlitz game '{room}' created!", "questions": randomized_questions}), 201

    except Exception as e:
        return jsonify({"error": "Server error"}), 500


@word_blitz_bp.route("/add_questions", methods=["POST"])
def add_questions():
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


@word_blitz_bp.route("/submit_all", methods=["POST"])
def submit_all_answers():
    try:
        data = request.get_json()
        room = data.get('room')
        username = data.get('username', "Guest")
        answers = data.get('answers', {})

        game = Game.query.filter_by(room=room, game_type="WordBlitz").first()
        if not game:
            return jsonify({"error": "Room does not exist"}), 404

        results = {}
        for question_id, word in answers.items():
            question = Question.query.get(question_id)
            if not question:
                results[question_id] = {"word": word, "status": "❌ Invalid question"}
                continue

            letter = word[0].upper()
            if letter != question.prompt[0].upper():
                results[question_id] = {"word": word, "status": f"❌ Must start with {question.prompt[0]}"}
            else:
                new_word = Word(word=word, game_id=game.id, username=username, question_id=question_id)
                db.session.add(new_word)
                results[question_id] = {"word": word, "status": "✅ Accepted"}

        db.session.commit()
        return jsonify({"message": "All answers submitted!", "results": results}), 200

    except Exception as e:
        return jsonify({"error": "Server error"}), 500
