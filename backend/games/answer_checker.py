from flask import Blueprint, request, jsonify
from setup.extensions import db
from models import Answer, Game, User, Question_blitz, Word_blitz, AnswerVote, Player, QuestionSet_blitz as QuestionSet, GameQuestionBlitz
from datetime import datetime
from ollama import chat, ChatResponse
import json
import traceback

answer_checker_bp = Blueprint('answer_checker', __name__)

@answer_checker_bp.route("/check1", methods=["POST"])
def check_answer1():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        game_id = data.get("game_id")
        question_id = data.get("question_id")
        username = data.get("username")  # Changed from user_name to username for consistency
        answer_text = (data.get("answer_text") or "").strip()

        if not all([game_id, question_id, username, answer_text]):
            return jsonify({"error": "Missing required fields"}), 400

        game = Game.query.get(game_id)
        if not game:
            return jsonify({"error": "Game not found"}), 404

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        question = Question_blitz.query.get(question_id)
        if not question:
            return jsonify({"error": "Question not found"}), 404

        # 1. Insert a new Answer row for this submission.
        new_answer = Answer(
            game_id=game_id,
            question_id=question_id,
            user_id=user.id,
            answer_text=answer_text
        )
        db.session.add(new_answer)
        db.session.commit()

        # 2. Prepare the system prompt for AI correctness checking
        system_prompt = (
            "You are a correctness checker. Respond in JSON format only:\n"
            "{\"correct\": boolean, \"explanation\": \"text\"}"
        )
        user_prompt = f"Question: {question.prompt}\nAnswer: {answer_text}\nIs this correct?"

        # 3. Call the AI model (Ollama or another)
        try:
            response: ChatResponse = chat(
                model="llama3.2:1b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                format="json",
            )
            ai_response = json.loads(response.message.content)
        except Exception as e:
            print(f"AI error: {str(e)}")
            ai_response = {"correct": False, "explanation": "AI verification failed"}

        # 4. Update the new Answer with AI’s result
        new_answer.ai_correct = bool(ai_response.get("correct", False))
        new_answer.ai_result = ai_response.get("explanation", "")
        db.session.commit()

        # 5. If AI says it's correct, increment the player's score right away.
        if new_answer.ai_correct:
            # Lookup the Player record for this user in this game
            player = Player.query.filter_by(game_id=game_id, username=username).first()
            if player:
                # Add 10 points (or 1, or any logic you desire)
                player.score += 10
                db.session.commit()

        return jsonify({
            "message": "Answer checked via AI",
            "ai_correct": new_answer.ai_correct,
            "ai_result": new_answer.ai_result,
            "answer_id": new_answer.id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in check_answer: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
@answer_checker_bp.route("/check", methods=["POST"])
def check_answer():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        game_id = data.get("game_id")
        question_id = data.get("question_id")
        username = data.get("username")
        answer_text = (data.get("answer_text") or "").strip()

        if not all([game_id, question_id, username, answer_text]):
            return jsonify({"error": "Missing required fields"}), 400

        # 1. Validate game, user, and question exist:
        game = Game.query.get(game_id)
        if not game:
            return jsonify({"error": "Game not found"}), 404

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        question = Question_blitz.query.get(question_id)
        if not question:
            return jsonify({"error": "Question not found"}), 404

        # 2. Check if the first letter matches what GameQuestionBlitz says
        #    (Assuming 'GameQuestionBlitz.letter' is the assigned letter).
        gqb = GameQuestionBlitz.query.filter_by(game_id=game.id, question_id=question_id).first()
        if not gqb:
            return jsonify({"error": "Invalid question/letter assignment"}), 404
        print(f"Letter for question {question_id} is {gqb.letter}.")
        Correct_Letter = True
        # If the first letter doesn’t match, return an error.
        if not answer_text or answer_text[0].upper() != gqb.letter.upper():
            print(f"Answer '{answer_text}' does not start with '{gqb.letter}'.")
            Correct_Letter = False
            """return jsonify({
                "error": f"Answer must start with '{gqb.letter}'",
                "message": "No AI check or vote possible when letter doesn't match."
            }), 400
"""
        # 3. At this point the letter matches => create the Answer row
        new_answer = Answer(
            game_id=game_id,
            question_id=question_id,
            user_id=user.id,
            answer_text=answer_text
        )
        db.session.add(new_answer)
        db.session.commit()
        if Correct_Letter:
            # 4. Prepare AI system prompt
            system_prompt = (
                "You are a correctness checker. Respond in JSON format only:\n"
                "{\"correct\": boolean, \"explanation\": \"text\"}"
            )
            user_prompt = f"Question: {question.prompt}\nAnswer: {answer_text}\nIs this correct?"

            # 5. Call AI
            try:
                response: ChatResponse = chat(
                    model="llama3.2:1b",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    format="json",
                )
                ai_response = json.loads(response.message.content)
            except Exception as e:
                print(f"AI error: {str(e)}")
                ai_response = {"correct": False, "explanation": "AI verification failed"}
        else:
            ai_response = {"correct": False, "explanation": "Letter mismatch"}
        # 6. Update the Answer row with AI correctness
        new_answer.ai_correct = bool(ai_response.get("correct", False))
        new_answer.ai_result = ai_response.get("explanation", "")
        db.session.commit()

        # 7. If AI says correct => +10 points
        if new_answer.ai_correct:
            player = Player.query.filter_by(game_id=game_id, username=username).first()
            if player:
                player.score += 10
                db.session.commit()

        return jsonify({
            "message": "Answer checked via AI",
            "ai_correct": new_answer.ai_correct,
            "ai_result": new_answer.ai_result,
            "answer_id": new_answer.id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in check_answer: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@answer_checker_bp.route("/request_vote", methods=["POST"])
def request_vote():
    try:
        data = request.get_json()
        print(f"Request data: {data}")  # Debugging line
        ###############
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        answer_id = data.get("answer_id")
        username = data.get("username")
        user = User.query.filter_by(username=username).first()
        if user:
            user_id = user.id
            print(f"User ID for {username} is {user_id}.")
        else:
            print("User not found.")


        if not all([answer_id, username]):
            return jsonify({"error": "Missing answer_id or username"}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        answer = Answer.query.get(answer_id)
        if not answer:
            return jsonify({"error": "Answer not found"}), 404

        if answer.user_id != user_id and user.role != 0:
            return jsonify({
                "error": "Unauthorized",
                "message": "Only answer owner or admin can request votes"
            }), 403

        answer.vote_requested = True
        db.session.commit()

        return jsonify({
            "message": "Vote requested successfully",
            "answer_id": answer.id,
            "vote_requested": True
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in request_vote: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@answer_checker_bp.route("/cast_vote", methods=["POST"])
def cast_vote():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        answer_id = data.get("answer_id")
        vote_value = data.get("vote")
        username = data.get("username")

        if not all([answer_id, vote_value in ["yes", "no"], username]):
            return jsonify({"error": "Missing or invalid parameters"}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        answer = Answer.query.get(answer_id)
        if not answer:
            return jsonify({"error": "Answer not found"}), 404

        if not answer.vote_requested:
            return jsonify({"error": "Voting not requested for this answer"}), 400

        existing_vote = AnswerVote.query.filter_by(
            answer_id=answer_id, 
            user_id=user.id
        ).first()

        if existing_vote:
            existing_vote.vote_value = vote_value
        else:
            new_vote = AnswerVote(
                answer_id=answer_id,
                user_id=user.id,
                vote_value=vote_value
            )
            db.session.add(new_vote)

        yes_count = AnswerVote.query.filter_by(
            answer_id=answer_id, 
            vote_value="yes"
        ).count()
        no_count = AnswerVote.query.filter_by(
            answer_id=answer_id, 
            vote_value="no"
        ).count()

        answer.vote_yes = yes_count
        answer.vote_no = no_count
        answer.ai_correct = answer.override_value if answer.admin_override else (yes_count > no_count)
        db.session.commit()

        wb_record = Word_blitz.query.filter_by(
            game_id=answer.game_id,
            question_id=answer.question_id,
            username=user.username
        ).first()
        if wb_record:
            wb_record.word_correct = answer.ai_correct
            db.session.commit()

        recalc_scores(answer.game_id)

        return jsonify({
            "message": "Vote cast successfully",
            "vote_yes": yes_count,
            "vote_no": no_count,
            "final_correct": answer.ai_correct
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in cast_vote: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@answer_checker_bp.route("/override", methods=["POST"])
def admin_override():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        answer_id = data.get("answer_id")
        override_value = data.get("override_value")
        username = data.get("username")

        if not all([answer_id, override_value is not None, username]):
            return jsonify({"error": "Missing required fields"}), 400

        # Check admin privileges
        user = User.query.filter_by(username=username).first()
        if not user or user.role != 0:
            return jsonify({"error": "Admin privileges required"}), 403

        # Grab the answer row
        answer = Answer.query.get(answer_id)
        if not answer:
            return jsonify({"error": "Answer not found"}), 404

        # Mark override
        answer.admin_override = True
        answer.override_value = bool(override_value)
        answer.ai_correct = bool(override_value)
        db.session.commit()

        # We do NOT have answer.user, so we fetch the user from answer.user_id
        user_for_answer = User.query.get(answer.user_id)  # returns a User object or None
        if user_for_answer:
            # Now we have their username
            wb_record = Word_blitz.query.filter_by(
                game_id=answer.game_id,
                question_id=answer.question_id,
                username=user_for_answer.username
            ).first()
            if wb_record:
                wb_record.word_correct = bool(override_value)
                db.session.commit()

        recalc_scores(answer.game_id)

        return jsonify({
            "message": "Admin override applied successfully",
            "answer_id": answer.id,
            "override_value": bool(override_value)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in admin_override: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

def recalc_scores(game_id):
    """
    Recalculate each player's total score for the given game_id
    by iterating over the Answer rows. If an answer is considered correct
    (whether by admin override, majority vote, or AI correctness),
    add points to that player's total.
    """
    try:
        game = Game.query.get(game_id)
        if not game:
            return

        # Track scores in a dict keyed by username
        player_scores = {}

        answers = Answer.query.filter_by(game_id=game_id).all()
        for ans in answers:
            # We only have user_id, so just do a quick lookup
            if not ans.user_id:
                continue

            user = User.query.get(ans.user_id)  # fetch the user row
            if not user:
                continue

            username = user.username
            if username not in player_scores:
                player_scores[username] = 0

            # Decide if this answer is "correct"
            if ans.admin_override:
                if ans.override_value:
                    player_scores[username] += 10  # or +1
            elif ans.vote_requested:
                if ans.vote_yes > ans.vote_no:
                    player_scores[username] += 10
            else:
                if ans.ai_correct:
                    player_scores[username] += 10

        # Now update each player's score in the DB
        for player in game.players:
            if player.username in player_scores:
                player.score = player_scores[player.username]
            else:
                player.score = 0

        db.session.commit()
        print(f"Scores recalculated for game {game_id}")

    except Exception as e:
        db.session.rollback()
        print(f"Error in recalc_scores: {str(e)}")
