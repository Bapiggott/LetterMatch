from setup.extensions import db
from flask import Flask

app = Flask(__name__)

with app.app_context():
    db.drop_all()  
    db.create_all()  
    print("Database reset successfully.")
