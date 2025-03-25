from flask import Blueprint, request, jsonify

#from models import QuestionSet, Question, Answer

answer_checker_bp = Blueprint('answer_checker', __name__)

#from app import db
#from models import Game, GameQuestion, Player


@answer_checker_bp.route("/check_answer", methods=["POST"])
def check_answer():
    #moved import to avoid circular import - Christina
    
    from app import db
    from models import Game, GameQuestion, Player

    data = request.get_json()
    question_id = data.get("question_id")
    answer = data.get("answer")

    #query for specific question id
    question = Question.query.get(question_id)
    if not question:
        return jsonify({"error": "Question not found"}), 404
    if question.answer.lower() == answer.lower():
        return jsonify({"correct": True})
    return jsonify({"correct": False})

def send_response_to_ollama_server(data):
    # Send data to Ollama server
    pass