# answer_checker.py

from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import Answer, Game, User, Question_blitz, Word_blitz, AnswerVote
from datetime import datetime
from ollama import chat, ChatResponse
import json

answer_checker_bp = Blueprint('answer_checker', __name__)


# -------------------------------------------
# (2) /check - unchanged from your snippet
# -------------------------------------------
@answer_checker_bp.route("/check", methods=["POST"])
def check_answer():
    print("Checking answer...")
    data = request.get_json()
    print("Received data:", data)
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    game_id = data.get("game_id")
    question_id = data.get("question_id")
    user_name = data.get("username")
    user_id = data.get("user_id")
    answer_text = (data.get("answer_text") or "").strip()

    question = Question_blitz.query.get(question_id)
    if not question:
        return jsonify({"error": f"Question {question_id} not found"}), 404

    prompt = question.prompt

    if not all([game_id, user_name, answer_text]):
        print("Missing fields:", game_id, user_name, answer_text)
        return jsonify({"error": "Missing required fields"}), 400

    # Verify game & user exist (optional)
    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": f"Game {game_id} not found"}), 404

    user = User.query.filter_by(username=user_name).first()
    if not user:
        return jsonify({"error": f"User {user_name} not found"}), 404

    user_id = user.id
    
    # Create a new Answer record
    new_answer = Answer(
        game_id=game_id,
        question_id=question_id,
        user_id=user_id,
        answer_text=answer_text
    )
    db.session.add(new_answer)
    db.session.commit()

    # ---- Prepare our messages for Ollama ----
    system_prompt = (
        "You are a correctness checker. "
        "Always respond in valid JSON ONLY, with the format:\n\n"
        "{\n"
        "  \"correct\": boolean,\n"
        "  \"explanation\": \"short text\"\n"
        "}\n\n"
        "No additional text outside this JSON object."
    )

    user_prompt = (
        f"Question: {prompt}. "
        f"User's answer: {answer_text}.\n"
        "Is this correct? Provide a JSON response only."
    )


    try:
        print("Calling Ollama...")
        # Call Ollama with model llama3.2:1b
        response: ChatResponse = chat(
            model="llama3.2:1b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ],
            format="json",
        )
        print("Ollama response:", response)
    except Exception as e:
        return jsonify({"error": f"Ollama request error: {str(e)}"}), 500
    raw_text = response.message.content
    if not raw_text:
        return jsonify({"error": "No content returned by Ollama"}), 500
    
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return jsonify({"error": "AI response was not valid JSON"}), 500
    
    # Expecting something like {"Correct": true, "explanation": "Stub explanation from AI"}
    is_correct = parsed.get("correct", False)
    explanation = parsed.get("explanation", "")

    # Store results in DB
    new_answer.ai_correct = bool(is_correct)
    new_answer.ai_result = explanation
    db.session.commit()
    #recalc_scores(game_id)

    """import json
    mock_response = json.dumps({
        "correct": True,
        "explanation": "Stub explanation from AI"
    })
    raw_text = mock_response

    # Attempt to parse as JSON
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return jsonify({"error": "AI response was not valid JSON"}), 500

    is_correct = parsed.get("correct", False)
    explanation = parsed.get("explanation", "")

    # Store results in DB
    new_answer.ai_correct = bool(is_correct)
    new_answer.ai_result = explanation
    db.session.commit()"""

    return jsonify({
        "message": "Answer checked via AI",
        "ai_correct": new_answer.ai_correct,
        "ai_result": new_answer.ai_result,
        "answer_id": new_answer.id
    }), 200


def recalc_scores(game_id):
    """
    Recalculate scores for all users in the given game.
    We'll define 'score' as the count of correct answers.
    """
    from models import Game, User, Answer

    # 1) fetch the game and all answers for that game
    game = Game.query.get(game_id)
    if not game:
        return

    # We'll map user_id -> correct_count
    user_scores = {}

    answers = Answer.query.filter_by(game_id=game_id).all()

    for ans in answers:
        if ans.admin_override:
            # If overridden by admin, trust override_value
            is_correct = ans.override_value
        else:
            # Otherwise trust ai_correct
            is_correct = ans.ai_correct
        
        if is_correct:
            user_scores[ans.user_id] = 1 # user_scores.get(ans.user_id, 0) + 1
        else:
            # just ensure user_scores has the key
            user_scores[ans.user_id] = 0 # user_scores.get(ans.user_id, 0)

    # 2) Now store these scores somewhere. 
    # For each user in the game, set user.score or a separate GamePlayer row, etc.
    # For example, if your 'GamePlayer' model tracks each user’s current score:
    game_players = game.players  # depends on your relationship
    # Or if you store scores in the 'User' table, you might do:

    for gp in game_players:
        # gp.user_id is the user, set gp.score to user_scores.get(user_id, 0)
        gp.score = user_scores.get(gp.username, 0)

    print("Recalculated scores for game:", game_id)
    print("Scores:", user_scores)

    db.session.commit()



# -------------------------------------------
# (3) /request_vote - sets vote_requested = True
# -------------------------------------------
@answer_checker_bp.route("/request_vote", methods=["POST"])
def request_vote():
    data = request.get_json()
    answer_id = data.get("answer_id")
    if not answer_id:
        return jsonify({"error": "answer_id is required"}), 400

    ans = Answer.query.get(answer_id)
    if not ans:
        return jsonify({"error": "Answer not found"}), 404

    ans.vote_requested = True
    db.session.commit()

    return jsonify({"message": f"Vote requested for Answer {ans.id}"}), 200


# -------------------------------------------
# (4) New route: /cast_vote
# -------------------------------------------
@answer_checker_bp.route("/cast_vote", methods=["POST"])
def cast_vote():
    """
    A user casts their vote (yes/no) on an Answer that has vote_requested = True.

    Expects JSON:
      {
        "answer_id": 123,
        "user_id": 42,
        "vote": "yes" or "no"
      }
    """
    data = request.get_json()
    answer_id = data.get("answer_id")
    user_id = data.get("user_id")
    vote_value = data.get("vote")

    if not all([answer_id, user_id, vote_value]):
        return jsonify({"error": "answer_id, user_id, and vote are required"}), 400

    ans = Answer.query.get(answer_id)
    if not ans:
        return jsonify({"error": f"Answer {answer_id} not found"}), 404

    # Make sure a vote was actually requested:
    if not ans.vote_requested:
        return jsonify({"error": "Voting not requested for this answer"}), 400

    # Check if user already voted
    existing_vote = AnswerVote.query.filter_by(answer_id=answer_id, user_id=user_id).first()
    if existing_vote:
        # Update existing vote
        existing_vote.vote_value = vote_value
    else:
        # Create new vote record
        new_vote = AnswerVote(answer_id=answer_id, user_id=user_id, vote_value=vote_value)
        db.session.add(new_vote)

    db.session.commit()

    # Now tally up the new totals:
    yes_count = AnswerVote.query.filter_by(answer_id=answer_id, vote_value="yes").count()
    no_count  = AnswerVote.query.filter_by(answer_id=answer_id, vote_value="no").count()

    ans.vote_yes = yes_count
    ans.vote_no = no_count

    # If admin_override is True, we keep ans.override_value.
    # Otherwise, final correctness depends on the vote majority.
    if ans.admin_override:
        final_correct = ans.override_value
    else:
        final_correct = (yes_count > no_count)

    ans.ai_correct = final_correct
    db.session.commit()

    # Optionally also update Word_blitz.word_correct:
    # (This depends on how your Word_blitz row is linked to the Answer.)
    # For example, if each user+question is in Word_blitz, you can do:
    wb_record = Word_blitz.query.filter_by(
        game_id=ans.game_id,
        question_id=ans.question_id,
        username=ans.user.username
    ).first()
    if wb_record:
        wb_record.word_correct = final_correct
        db.session.commit()

    return jsonify({
        "message": f"Vote cast by user {user_id} on answer {answer_id}",
        "vote_yes": yes_count,
        "vote_no": no_count,
        "final_correct": final_correct
    }), 200


# -------------------------------------------
# (5) /override - same as you had before
# -------------------------------------------
@answer_checker_bp.route("/override", methods=["POST"])
def admin_override():
    """
    An admin can override the AI's correctness.
    Expects { "answer_id": 123, "override_value": true/false }
    """
    data = request.get_json()
    answer_id = data.get("answer_id")
    override_value = data.get("override_value")

    if answer_id is None or override_value is None:
        return jsonify({"error": "answer_id and override_value are required"}), 400

    ans = Answer.query.get(answer_id)
    if not ans:
        return jsonify({"error": f"Answer {answer_id} not found"}), 404

    ans.admin_override = True
    ans.override_value = bool(override_value)
    db.session.commit()

    # We also update the final correctness to match the override
    ans.ai_correct = bool(override_value)
    db.session.commit()

    # Optionally also update Word_blitz
    wb_record = Word_blitz.query.filter_by(
        game_id=ans.game_id,
        question_id=ans.question_id,
        username=ans.user.username
    ).first()
    if wb_record:
        wb_record.word_correct = bool(override_value)
        db.session.commit()

    return jsonify({
        "message": f"Admin override => {ans.override_value}",
        "answer_id": ans.id
    }), 200
