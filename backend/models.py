from datetime import datetime
from setup.extensions import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, unique=True, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    password = db.Column(db.String, nullable=False)
    role = db.Column(db.Integer, default=1)  # Regular user = role 1
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    profile_pic = db.Column(db.String, nullable=True)
    games_played = db.Column(db.Integer, default=0)
    games_won = db.Column(db.Integer, default=0)
    profile_pic_base64 = db.Column(db.Text, nullable=True)

    friendships_1 = db.relationship('Friendship', foreign_keys='Friendship.username_1', backref='user_1', lazy=True)
    friendships_2 = db.relationship('Friendship', foreign_keys='Friendship.username_2', backref='user_2', lazy=True)

class Friendship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username_1 = db.Column(db.String, db.ForeignKey('user.username'), nullable=False)
    username_2 = db.Column(db.String, db.ForeignKey('user.username'), nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room = db.Column(db.String, unique=True, nullable=False)
    game_type = db.Column(db.String, nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    players = db.relationship('Player', backref='game', lazy=True)
    words = db.relationship('Word', backref='game', lazy=True)
    blitz_questions = db.relationship('GameQuestionBlitz', backref='game', lazy=True)
    started = db.Column(db.Boolean, default=False)
    time_limit = db.Column(db.Integer, default=60)
    start_time = db.Column(db.DateTime, nullable=True)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False)  # Allows non-registered players
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    date_joined = db.Column(db.DateTime, default=datetime.utcnow)
    is_creator = db.Column(db.Boolean, default=False)

    # Score for WordBlitz
    score = db.Column(db.Integer, default=0)

    
class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String, nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    username = db.Column(db.String, nullable=False)  # Allows non-registered players
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    #question_id = db.Column(db.Integer, db.ForeignKey('question_blitz.id'), nullable=False)


class QuestionSet_blitz(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False, unique=True)

class Question_blitz(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prompt = db.Column(db.String, nullable=False)
    question_set_id = db.Column(db.Integer, db.ForeignKey('question_set_blitz.id'), nullable=False)  

class Word_blitz(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String, nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    username = db.Column(db.String, nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question_blitz.id'), nullable=False) 
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    word_correct = db.Column(db.Boolean, default=False)


class GameQuestionBlitz(db.Model):
    """
    Associates a single question with a single game,
    plus the randomly assigned letter for that question in that game.
    """
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question_blitz.id'), nullable=False)
    letter = db.Column(db.String(1), nullable=False)  # Single letter
    question = db.relationship("Question_blitz", lazy=True)

class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)

class ChatParticipant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    chat_active = db.Column(db.Boolean, default=False)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)
    sender_id = db.Column(db.Integer, nullable=False)
    message_body = db.Column(db.String, nullable=False)
    read = db.Column(db.Boolean, default=False)

class Answer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    question_id = db.Column(db.Integer, nullable=True)  
    # Depending on your usage, you might or might not always have an associated question_id.
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    # The raw answer text submitted by the user:
    answer_text = db.Column(db.String, nullable=False)

    # The result from the AI (the entire explanation or short "yes/no" text).
    ai_result = db.Column(db.Text, nullable=True)
    # Whether the AI concluded it's correct or incorrect:
    ai_correct = db.Column(db.Boolean, default=None)
    explanation = db.Column(db.Text, nullable=True)

    # If a player requests a vote:
    vote_requested = db.Column(db.Boolean, default=False)
    # You could also store vote counts or other voting mechanism details here
    vote_yes = db.Column(db.Integer, default=0)
    vote_no = db.Column(db.Integer, default=0)
    # Admin override fields:
    admin_override = db.Column(db.Boolean, default=False)
    override_value = db.Column(db.Boolean, default=None)
    # e.g. override_value = True means “admin says it's definitely correct.”

    date_created = db.Column(db.DateTime, default=datetime.utcnow)


class AnswerVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    answer_id = db.Column(db.Integer, db.ForeignKey('answer.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    vote_value = db.Column(db.String, nullable=False)  # "yes" or "no"
    
    # Optionally, ensure uniqueness so a user can’t vote more than once
    __table_args__ = (
        db.UniqueConstraint('answer_id', 'user_id', name='uniq_answer_user_vote'),
    )

#letter match tables ---------------------------------------------------

#will provide our question prompts
class question_LetterMatch(db.Model):
    __tablename__ = 'question_LetterMatch'
    id = db.Column(db.Integer, primary_key=True)
    prompt = db.Column(db.String, nullable=False)

#link question to letters
class game_question_lettermatch(db.Model):
    __tablename__ = 'game_question_lettermatch'
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question_LetterMatch.id'), nullable=False)
    letter = db.Column(db.String(1), nullable=False)

    # Relationship to question_lettermatch
    question = db.relationship("question_LetterMatch", backref="game_questions", lazy=True)
        
#answers provided by players
class playerAnswer_LetterMatch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question_LetterMatch.id'), nullable=False)
    answer = db.Column(db.String(255))
    is_correct = db.Column(db.Boolean, default=False)
    score = db.Column(db.Integer)

    game = db.relationship('Game', backref=db.backref('player_answers', lazy=True))
    player = db.relationship('Player', backref=db.backref('answers', lazy=True))
    question = db.relationship('question_LetterMatch', backref=db.backref('answers', lazy=True))


#correct answers table 
class letterMatch_answers(db.Model):
    __tablename__ = 'LetterMatch_Answers'
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('question_LetterMatch.id'), nullable=False)
    correct_answer = db.Column(db.String, nullable=False)

        # Relationship to question_lettermatch
    question = db.relationship("question_LetterMatch", backref="correct_answers", lazy=True)
