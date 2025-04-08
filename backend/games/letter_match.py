from flask import Blueprint, request, jsonify
from models import Game, User, Player, question_LetterMatch, playerAnswer_LetterMatch, game_question_lettermatch
import random
from sqlalchemy import func
from setup.extensions import db
from datetime import datetime
import logging

from models import (
    Game, Player, playerAnswer_LetterMatch as Word,
    Question_blitz as Question,
    game_question_lettermatch,
    LetterMatch_Answers as answerKey,

)

letter_match_bp = Blueprint('letter_match', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_word(word, letter):
    if not word.lower().startswith(letter.lower()):
        return False
    if len(word) < 3:
        return False
    return True

def calculate_score(word, is_valid):
    return len(word) if is_valid else 0


@letter_match_bp.route('/start', methods=['POST'])
def start_game():
    logger.info("Received start game request")
    data = request.get_json()
    logger.debug(f"Start request data: {data}")
    
    room = data.get('room')
    username = data.get('username')
    chosen_letter = data.get("letter", random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
    round_count = data.get("rounds", 1)

    if not room or not username:
        logger.error("Missing room or username in start request")
        return jsonify({'error': 'Room and username are required'}), 400

    game = Game.query.filter_by(room=room).first()
    if not game:
        logger.error(f"Game not found for room: {room}")
        return jsonify({'error': 'Game not found'}), 404

    try:
        # Verify the requesting user is the creator
        creator = Player.query.filter_by(game_id=game.id, is_creator=True).first()
        if not creator or creator.username != username:
            logger.error(f"User {username} is not the creator of game {game.id}")
            return jsonify({'error': 'Only the game creator can start the game'}), 403

        logger.info(f"Starting game {game.id} with letter {chosen_letter} and {round_count} rounds")
        
        # Clear any existing game questions
        game_question_lettermatch.query.filter_by(game_id=game.id).delete()
        
        # Get random questions for the round
        questions = question_LetterMatch.query.order_by(func.random()).limit(round_count).all()
        if not questions:
            logger.error("No questions available in database")
            return jsonify({'error': 'No questions available'}), 400

        # Create game-question associations with the chosen letter
        for question in questions:
            game_question = game_question_lettermatch(
                game_id=game.id,
                question_id=question.id,
                letter=chosen_letter
            )
            db.session.add(game_question)
            logger.debug(f"Added question {question.id} to game")

        game.started = True
        game.start_time = datetime.utcnow()
        db.session.commit()
        logger.info(f"Game {game.id} started successfully")

        return jsonify({
            'message': 'Game started',
            'letter': chosen_letter,
            'questions': [{'id': q.id, 'prompt': q.prompt} for q in questions],
            'game_id': game.id,
            'players': [{
                'username': p.username,
                'score': p.score,
                'is_creator': p.is_creator
            } for p in Player.query.filter_by(game_id=game.id).all()]
        })
    except Exception as e:
        logger.error(f"Error starting game: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': 'Server error while starting game'}), 500
    
@letter_match_bp.route('/create', methods=['POST'])
def create_game():
    logger.info("Received request to create game")
    data = request.get_json()
    logger.debug(f"Request data: {data}")
    
    if not data:
        logger.error("No data received in request")
        return jsonify({'error': 'No data received'}), 400
    
    room = data.get('room')
    game_type = data.get('game_type')
    time_limit = data.get('time_limit', 60)
    
    if not room:
        logger.error("Room name not provided")
        return jsonify({'error': 'Room name is required'}), 400
    if not game_type:
        logger.error("Game type not provided")
        return jsonify({'error': 'Game type is required'}), 400
    
    try:
        logger.info(f"Attempting to create {game_type} game in room {room}")
        
        # Check if room already exists
        existing_game = Game.query.filter_by(room=room).first()
        if existing_game:
            logger.error(f"Room {room} already exists")
            return jsonify({'error': 'Room name already taken'}), 400
        
        # Create the game
        game = Game(room=room, game_type=game_type, time_limit=time_limit)
        db.session.add(game)
        db.session.flush()  # Get the game ID before commit
        logger.debug(f"Game created with ID: {game.id}")
        
        # Handle different game types
        if game_type == "LetterMatchSingle":
            username = data.get('username', 'SinglePlayer')
            logger.debug(f"Creating single player game for {username}")
            
            player = Player(
                username=username, 
                game_id=game.id, 
                is_creator=True,
                score=0
            )
            db.session.add(player)
            # single player ai opponent
            ai_bot = Player(
                username="Roberto_the_Robot",
                game_id=game.id,
                is_creator=False,
                score=0
            )
            db.session.add(ai_bot)
            logger.debug("Bot added to single player game")

            
        elif game_type == "LetterMatchLocal":
            player_names = data.get('player_names', [])
            if not player_names:
                logger.error("No player names provided for local game")
                db.session.rollback()
                return jsonify({'error': 'Player names are required for local game'}), 400
                
            logger.debug(f"Creating local game with players: {player_names}")
            for i, name in enumerate(player_names):
                player = Player(
                    username=name, 
                    game_id=game.id, 
                    is_creator=(i == 0),
                    score=0
                )
                db.session.add(player)
                
        elif game_type == "LetterMatchOnline":
            creator_username = data.get('creator_username')
            if not creator_username:
                logger.error("No creator username provided for online game")
                db.session.rollback()
                return jsonify({'error': 'Creator username is required'}), 400
                
            logger.debug(f"Creating online game with creator: {creator_username}")
            player = Player(
                username=creator_username, 
                game_id=game.id, 
                is_creator=True,
                score=0
            )
            db.session.add(player)
            
        else:
            logger.error(f"Invalid game type: {game_type}")
            db.session.rollback()
            return jsonify({'error': 'Invalid game type'}), 400
        
        db.session.commit()
        logger.info(f"Successfully created game {game.id} in room {room}")
        
        return jsonify({
            'message': f'{game_type} game created',
            'room': room,
            'game_id': game.id,
            'time_limit': time_limit
        })
        
    except Exception as e:
        logger.error(f"Error creating game: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': 'Server error while creating game'}), 500

@letter_match_bp.route('/join', methods=['POST'])
def join_game():
    logger.info("Received join game request")
    data = request.get_json()
    logger.debug(f"Join request data: {data}")
    
    username = data.get('username')
    room = data.get('room')

    if not username or not room:
        logger.error("Missing username or room in join request")
        return jsonify({'error': 'Username and room are required'}), 400

    game = Game.query.filter_by(room=room).first()
    if not game:
        logger.error(f"Game not found for room: {room}")
        return jsonify({'error': 'Game not found'}), 404

    try:
        # Check if player already exists
        existing_player = Player.query.filter_by(username=username, game_id=game.id).first()
        if existing_player:
            logger.info(f"Player {username} rejoining game {game.id}")
            return jsonify({
                'message': 'Rejoined game',
                'room': room,
                'game_id': game.id
            })

        logger.debug(f"Adding new player {username} to game {game.id}")
        player = Player(username=username, game_id=game.id, score=0)
        db.session.add(player)
        db.session.commit()

        return jsonify({
            'message': 'Joined game',
            'room': room,
            'game_id': game.id
        })
    except Exception as e:
        logger.error(f"Error joining game: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': 'Server error while joining game'}), 500
    
#submit answers 
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

    # Find the GameQuestionlettermatch row for the given question
    gqb = game_question_lettermatch.query.filter_by(game_id=game.id, question_id=question_id).first()

    if not gqb:
        return jsonify({"error": "Invalid question"}), 400

    # Validate if the word starts with the assigned letter
    if not submitted_word or submitted_word[0].upper() != gqb.letter.upper():
        return jsonify({"error": f"Answer must start with '{gqb.letter}'"}), 400
    
    # Validate if the word starts with the assigned letter
    if not gqb:
        return jsonify({"error": "Invalid question"}), 400

    if not submitted_word or submitted_word[0].upper() != gqb.letter.upper():
        return jsonify({"error": f"Answer must start with '{gqb.letter}'"}), 400

    # validated 
    word_correct = True
    player.score += 10

    

    # Record the word in letter match 
    new_word = Word(
        word=submitted_word,
        game_id=game.id,
        username=username,
        question_id=question_id,
        word_correct=word_correct,
    )
    db.session.add(new_word)

    # Simple scoring: +10 points
    db.session.commit()

    return jsonify({"message": "Answer accepted", "new_score": player.score}), 200


@letter_match_bp.route('/submit_all', methods=['POST'])
def submit_all_answers():
    logger.info("Received submit answers request")
    data = request.get_json()
    logger.debug(f"Submit answers data: {data}")
    
    username = data.get('username')
    game_id = data.get('game_id')
    answers = data.get('answers')

    if not username or not game_id or not answers:
        logger.error("Missing required fields in submit request")
        return jsonify({'error': 'Missing required fields'}), 400

    game = Game.query.get(game_id)
    if not game:
        logger.error(f"Game not found with ID: {game_id}")
        return jsonify({'error': 'Game not found'}), 404

    player = Player.query.filter_by(username=username, game_id=game_id).first()
    if not player:
        logger.error(f"Player {username} not found in game {game_id}")
        return jsonify({'error': 'Player not found in this game'}), 404

    try:
        elapsed = (datetime.utcnow() - game.start_time).total_seconds() if game.start_time else 0
        if elapsed > game.time_limit:
            return jsonify({"error": "Time is up"}), 400

        results = {}

        for qid, word in answers.items():
            word = word.strip()
            gqb = game_question_lettermatch.query.filter_by(game_id=game.id, question_id=qid).first()
            if not gqb:
                results[qid] = {"word": word, "status": "❌ Invalid question"}
                continue

            # Check if the word starts with the correct letter
            if not word or word[0].upper() != gqb.letter.upper():
                results[qid] = {"word": word, "status": f"❌ Must start with {gqb.letter}"}
                continue

            # ai validation
            question = question_LetterMatch.query.get(gqb.question_id)
            if question is None or not ai_valid(word, question.category):
                results[qid] = {"word": word, "status": "❌ Not a valid answer (AI)"}
                continue



            # Save valid word
            new_word = Word(
                word=word,
                game_id=game.id,
                username=username,
                question_id=qid,
                word_correct=True,
            )
            db.session.add(new_word)

            # Score and success
            player.score += 10
            results[qid] = {"word": word, "status": "✅ Accepted"}

        db.session.commit()

        return jsonify({
            "message": "All answers submitted!",
            "results": results,
            "score": player.score
        }), 200

    except Exception as e:
        logger.exception("Error submitting answers")
        return jsonify({"error": "Server error"}), 500

@letter_match_bp.route('/test', methods=['GET'])
def test_connection():
    logger.info("Test connection endpoint hit")
    return jsonify({
        'message': 'Backend connection successful!',
        'status': 'OK'
    }), 200

def ai_valid(word, category):
    # Valid categories with corresponding words
    valid_categories = {
        'Names': {
            'A': ['Alice', 'Adam', 'Aaron'],
            'B': ['Ben', 'Bella', 'Bobby'],
            'C': ['Charlie', 'Catherine', 'Chris'],
            'D': ['David', 'Diana', 'Daniel'],
            'E': ['Eve', 'Ethan', 'Emma'],
            'F': ['Felix', 'Fiona', 'Frank'],
            'G': ['George', 'Grace', 'Gina'],
            'H': ['Hannah', 'Henry', 'Helen'],
            'I': ['Ivy', 'Ian', 'Isla'],
            'J': ['James', 'Julia', 'John'],
            'K': ['Kate', 'Kevin', 'Katherine'],
            'L': ['Liam', 'Laura', 'Leo'],
            'M': ['Michael', 'Mia', 'Megan'],
            'N': ['Nina', 'Nathan', 'Noah'],
            'O': ['Olivia', 'Oscar', 'Owen'],
            'P': ['Paul', 'Penny', 'Peter'],
            'Q': ['Quincy', 'Quinn', 'Queen'],
            'R': ['Rachel', 'Ryan', 'Riley'],
            'S': ['Sophia', 'Sam', 'Sophie'],
            'T': ['Thomas', 'Tina', 'Tyler'],
            'U': ['Uma', 'Umar', 'Ursula'],
            'V': ['Victor', 'Vera', 'Violet'],
            'W': ['William', 'Wendy', 'Walter'],
            'X': ['Xander', 'Xena', 'Xander'],
            'Y': ['Yara', 'Yusuf', 'Yasmine'],
            'Z': ['Zoe', 'Zane', 'Zara'],
        },
        'Animals': {
            'A': ['Antelope', 'Alligator', 'Aardvark'],
            'B': ['Bear', 'Bison', 'Bat'],
            'C': ['Cat', 'Cheetah', 'Crocodile'],
            'D': ['Deer', 'Dolphin', 'Dog'],
            'E': ['Elephant', 'Eagle', 'Eel'],
            'F': ['Fox', 'Frog', 'Flamingo'],
            'G': ['Giraffe', 'Goat', 'Goose'],
            'H': ['Horse', 'Hippo', 'Hawk'],
            'I': ['Iguana', 'Impala', 'Indigo Bunting'],
            'J': ['Jaguar', 'Jellyfish', 'Jackal'],
            'K': ['Kangaroo', 'Koala', 'Killer Whale'],
            'L': ['Lion', 'Lynx', 'Leopard'],
            'M': ['Monkey', 'Moose', 'Mole'],
            'N': ['Narwhal', 'Newt', 'Nightingale'],
            'O': ['Owl', 'Octopus', 'Otter'],
            'P': ['Penguin', 'Panda', 'Parrot'],
            'Q': ['Quail', 'Quokka', 'Quoll'],
            'R': ['Rabbit', 'Raccoon', 'Reindeer'],
            'S': ['Swan', 'Snake', 'Shark'],
            'T': ['Tiger', 'Turtle', 'Toucan'],
            'U': ['Urial', 'Uakari', 'Umbrella Bird'],
            'V': ['Vulture', 'Viper', 'Vicuna'],
            'W': ['Wolf', 'Whale', 'Walrus'],
            'X': ['Xerus', 'Xenopus', 'Xantus'],
            'Y': ['Yak', 'Yellowtail', 'Yeti Crab'],
            'Z': ['Zebra', 'Zorilla', 'Zebu'],
        },
        'Objects': {
            'A': ['Apple', 'Anchor', 'Armchair'],
            'B': ['Ball', 'Bottle', 'Broom'],
            'C': ['Chair', 'Clock', 'Candle'],
            'D': ['Desk', 'Drawer', 'Door'],
            'E': ['Eraser', 'Envelope', 'Egg'],
            'F': ['Fork', 'Flashlight', 'Fan'],
            'G': ['Glove', 'Guitar', 'Glass'],
            'H': ['Hat', 'Hammer', 'Helmet'],
            'I': ['Iron', 'Incense', 'Instrument'],
            'J': ['Jar', 'Jacket', 'Jewel'],
            'K': ['Kettle', 'Key', 'Kite'],
            'L': ['Lamp', 'Ladder', 'Locket'],
            'M': ['Mirror', 'Mug', 'Map'],
            'N': ['Notebook', 'Nail', 'Net'],
            'O': ['Oven', 'Orange', 'Object'],
            'P': ['Pen', 'Pillow', 'Phone'],
            'Q': ['Quilt', 'Queue', 'Quiver'],
            'R': ['Ruler', 'Radio', 'Ring'],
            'S': ['Spoon', 'Shovel', 'Scissors'],
            'T': ['Table', 'Towel', 'T-shirt'],
            'U': ['Umbrella', 'Urn', 'Upright'],
            'V': ['Vase', 'Vacuum', 'Violin'],
            'W': ['Wrench', 'Wallet', 'Window'],
            'X': ['Xylophone', 'X-box', 'X-ray'],
            'Y': ['Yarn', 'Yo-yo', 'Yellowstone'],
            'Z': ['Zipper', 'Zebra-print', 'Zune'],
        },
        # Add more categories like 'Cities_or_Countries' or 'Foods' in similar fashion
        'Cities_or_Countries': {
            'A': ['Amsterdam', 'Athens', 'Algeria'],
            'B': ['Berlin', 'Brussels', 'Brazil'],
            'C': ['Cairo', 'Chicago', 'Canada'],
            'D': ['Dubai', 'Dublin', 'Denmark'],
            'E': ['Edinburgh', 'El Salvador', 'Ecuador'],
            'F': ['Florence', 'Frankfurt', 'France'],
            'G': ['Geneva', 'Guatemala', 'Greece'],
            'H': ['Helsinki', 'Houston', 'Hungary'],
            'I': ['Istanbul', 'India', 'Iran'],
            'J': ['Jakarta', 'Jerusalem', 'Japan'],
            'K': ['Kyoto', 'Kuwait', 'Kenya'],
            'L': ['Lisbon', 'London', 'Lebanon'],
            'M': ['Madrid', 'Mexico', 'Morocco'],
            'N': ['Nairobi', 'Naples', 'Norway'],
            'O': ['Oslo', 'Ottawa', 'Oman'],
            'P': ['Paris', 'Prague', 'Peru'],
            'Q': ['Quito', 'Qingdao', 'Qatar'],
            'R': ['Rome', 'Riyadh', 'Russia'],
            'S': ['Seoul', 'Stockholm', 'Spain'],
            'T': ['Tokyo', 'Toronto', 'Thailand'],
            'U': ['Ulaanbaatar', 'Utrecht', 'Ukraine'],
            'V': ['Vienna', 'Valencia', 'Vietnam'],
            'W': ['Warsaw', 'Wellington', 'West Bank'],
            'X': ['Xiamen', 'Xi’an', 'Xiangyang'],
            'Y': ['Yokohama', 'Yaoundé', 'Yemen'],
            'Z': ['Zurich', 'Zanzibar', 'Zambia'],
            },

        'Foods': {
            'A': ['Apple', 'Apricot', 'Avocado'],
            'B': ['Banana', 'Blueberry', 'Blackberry'],
            'C': ['Cherry', 'Cantaloupe', 'Coconut'],
            'D': ['Date', 'Dragonfruit', 'Durian'],
            'E': ['Elderberry'],
            'F': ['Fig'],
            'G': ['Grapes', 'Guava', 'Gooseberry'],
            'H': ['Honeydew'],
            'I': ['Indian Fig', 'Illawarra Plum'],
            'J': ['Jackfruit', 'Jujube'],
            'K': ['Kiwi', 'Kumquat'],
            'L': ['Lemon', 'Lime', 'Lychee'],
            'M': ['Mango', 'Melon', 'Mulberry'],
            'N': ['Nectarine'],
            'O': ['Orange', 'Olive'],
            'P': ['Pineapple', 'Papaya', 'Peach'],
            'Q': ['Quince'],
            'R': ['Raspberry', 'Rambutan'],
            'S': ['Strawberry', 'Starfruit'],
            'T': ['Tangerine', 'Tomato'],
            'U': ['Ugli Fruit'],
            'V': ['Velvet Apple'],
            'W': ['Watermelon'],
            'X': ['Xigua'],  # Chinese watermelon
            'Y': ['Yellow Passionfruit'],
            'Z': ['Ziziphus Fruit'],
        },


    }

    # Get the list of valid words that start with the first letter of the word
    first_letter = word[0].upper()
    possible_answers = valid_categories.get(category, {}).get(first_letter, [])

    # Compare capitalized version of input word against list
    return word.capitalize() in possible_answers

    
    
