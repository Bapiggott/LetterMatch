from datetime import datetime
from setup.extensions import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, unique=True, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    password = db.Column(db.String, nullable=False)
    role = db.Column(db.Integer, default=1)  # Regular user = role 1
    date_created = db.Column(db.DateTime, default=datetime.utcnow)

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

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False)  # Allows non-registered players
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    date_joined = db.Column(db.DateTime, default=datetime.utcnow)

class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String, nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    username = db.Column(db.String, nullable=False)  # Allows non-registered players
    date_added = db.Column(db.DateTime, default=datetime.utcnow)

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