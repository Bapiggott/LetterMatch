from setup.extensions import db
from models import Question_blitz as Question, QuestionSet_blitz as QuestionSet
from flask import current_app

def seed_question_sets():
    with current_app.app_context():
        if QuestionSet.query.first():  # Check if data already exists
            print("✅ Question sets already exist. Skipping seeding.")
            return
        
        print("🚀 Seeding question sets...")

        sets = {
            "General Set 1": [
                "Name an animal", "Name a country", "Name a fruit", "Name a city",
                "Name a job", "Name a brand", "Name a famous person", "Name a movie title",
                "Name a car brand", "Name a food"
            ],
            "General Set 2": [
                "Name a sport", "Name a historical event", "Name a book title",
                "Name a household item", "Name a type of clothing", "Name a tool",
                "Name a beverage", "Name a type of tree", "Name a mode of transportation", "Name a type of weather"
            ],
            "General Set 3": [
                "Name a school subject", "Name a famous landmark", "Name a piece of furniture",
                "Name a vehicle", "Name a musical instrument", "Name a type of footwear",
                "Name an electronic device", "Name a hobby", "Name a video game", "Name a famous scientist"
            ],
            "General Set 4": [
                "Name a household appliance", "Name a social media platform", "Name a type of candy",
                "Name a language", "Name a type of flower", "Name a holiday", "Name a board game",
                "Name a type of fish", "Name a superhero", "Name a TV show"
            ],
            "General Set 5": [
                "Name a famous painter", "Name a type of bread", "Name a zoo animal",
                "Name a type of hat", "Name a brand of shoes", "Name a famous battle",
                "Name a programming language", "Name a space object", "Name a type of cheese", "Name a sports team"
            ],
            "General Set 6": [
                "Name a type of pasta", "Name a cartoon character", "Name a video game character",
                "Name a mode of public transport", "Name a planet", "Name a sea creature",
                "Name a clothing brand", "Name a type of soup", "Name a gemstone", "Name a famous athlete"
            ],
            "General Set 7": [
                "Name a kitchen utensil", "Name a type of tree", "Name a type of nut",
                "Name a country in Europe", "Name a soft drink brand", "Name a board game",
                "Name a type of fabric", "Name a pizza topping", "Name a dance style", "Name a Nobel Prize winner"
            ],
            "General Set 8": [
                "Name a mountain range", "Name a classical composer", "Name a type of bird",
                "Name a river", "Name a dog breed", "Name a video streaming service",
                "Name a vegetable", "Name a card game", "Name a horror movie", "Name a computer brand"
            ],
            "General Set 9": [
                "Name a phone brand", "Name a movie director", "Name a detective character",
                "Name a superhero movie", "Name a type of sandwich", "Name a historical empire",
                "Name a world-famous scientist", "Name a type of dessert", "Name a spy movie", "Name a sci-fi book"
            ],
            "General Set 10": [
                "Name a breakfast food", "Name a futuristic technology", "Name a type of cookie",
                "Name a famous magician", "Name a castle", "Name a train station",
                "Name a chemical element", "Name a jazz musician", "Name a horror novel", "Name a theme park"
            ],
            "General Set 11": [
                "Name a type of flower", "Name a winter sport", "Name a planet in the solar system",
                "Name a brand of cereal", "Name a reptile", "Name a science fiction TV show",
                "Name a children’s book", "Name a detective novel", "Name an ancient civilization", "Name a type of energy source"
            ],
            "General Set 12": [
                "Name a type of pasta", "Name a bakery item", "Name a professional sport team",
                "Name a wild animal", "Name a classic rock band", "Name a modern gadget",
                "Name a Marvel character", "Name a job that involves travel", "Name a form of currency", "Name a street food"
            ],
            "General Set 13": [
                "Name a horror movie villain", "Name a famous festival", "Name a prehistoric animal",
                "Name a royal family", "Name a technology company", "Name a type of weapon",
                "Name a famous philosopher", "Name a university", "Name a popular ice cream flavor", "Name a book series"
            ],
            "General Set 14": [
                "Name a famous explorer", "Name a space mission", "Name a type of tree fruit",
                "Name a sea animal", "Name a flightless bird", "Name a major bridge",
                "Name a non-alcoholic drink", "Name a traditional dance", "Name a horror game", "Name a social movement"
            ],
            "General Set 15": [
                "Name a castle", "Name a folk tale", "Name a luxury brand",
                "Name a famous painting", "Name a submarine animal", "Name a country in Asia",
                "Name a military rank", "Name a reality TV show", "Name a classic film", "Name a famous pirate"
            ]
        }


        for set_name, questions in sets.items():
            question_set = QuestionSet(name=set_name)
            db.session.add(question_set)
            db.session.commit()

            for prompt in questions:
                db.session.add(Question(prompt=prompt, question_set_id=question_set.id))

        db.session.commit()
        print("✅ Question sets seeded successfully!")
