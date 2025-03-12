import React, { useState, useEffect } from "react";
import Layout from '../Layout/Layout';
import './LM_SinglePlayer.css';

const LM_singlePlayer = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // list of letters
    const [getLetter, setGetLetter] = useState(""); // State for the selected letter
    const [timeLimit, setTimeLimit] = useState(60); // Timer set to 60 sec
    const [gameStart, setGameStart] = useState(false); // Game start state
    const [gameOver, setGameOver] = useState(false); // Game over state

    // Timer useEffect hook
    useEffect(() => {
        let timer;
        if (gameStart && timeLimit > 0) {
            const timer = setInterval(() => {
                setTimeLimit((prevTime) => prevTime - 1);
            }, 1000); // Decrements every second

            return () => clearInterval(timer);
        }
        else if (timeLimit === 0) {
            setGameStart(false);
            setGameOver(true);
            alert("!!! Game Over - You Ran Out of Time !!!");
        }
    }, [gameStart, timeLimit]);

    // Function to handle user input for a letter
    const handlePrompt = () => {
        const input = window.prompt("Enter a letter or type 'Random' for a random letter:");

        if (input !== null && input.length === 1 && letters.includes(input.toUpperCase())) {
            setGetLetter(input.toUpperCase());
            alert(input.toUpperCase() + " is your letter");
            startGame(input.toUpperCase()); //starts game
        } else if (input.toLowerCase() === "random") {
            const randomLetter = letters[Math.floor(Math.random() * letters.length)];
            setGetLetter(randomLetter);
            alert(randomLetter + " is your letter");
            startGame(randomLetter); //user gets random letter and starts game
        } else {
            alert("Not a valid letter");
        }
    };

    const startGame = () => {
        setGameStart(true);
        setGameOver(false);
        setTimeLimit(60);
        
    }

    //to allow users to enter name
    const namePrompt = () => {
        const Name_input = window.prompt(`Enter a NAME starting with '${getLetter}':`);

       //does checking if it starts with correct letter
       if (Name_input && Name_input[0].toUpperCase() !== getLetter.toUpperCase()) {
            alert(`INCORRECT - '${Name_input}' does not start with '${getLetter}'. Please try again and don't give up!`);
        } else if (Name_input) {
            alert(`NICE JOB! '${Name_input}' starts with '${getLetter}'. Keep up the great work! 👍`);
        }
        
    };

      //to allow users to enter place
      const placePrompt = () => {
        const input = window.prompt(`Enter a GEOGRAPHICAL PLACE starting with '${getLetter}':`);

       //does checking if it starts with correct letter
       if (input && input[0].toUpperCase() !== getLetter.toUpperCase()) {
            alert(`INCORRECT - '${input}' does not start with '${getLetter}'. Please try again and don't give up!`);
        } else if (input) {
            alert(`AMAZING! '${input}' starts with '${getLetter}'.`);
        }
        
    };

        //to allow users to enter animal
        const animalPrompt = () => {
        const input = window.prompt(`Enter an ANIMAL starting with '${getLetter}':`);

        //does checking if it starts with correct letter
        if (input && input[0].toUpperCase() !== getLetter.toUpperCase()) {
            alert(`INCORRECT - '${input}' does not start with '${getLetter}'. Please try again and don't give up!`);
        } else if (input) {
            alert(`Yipee!!!! '${input}' starts with '${getLetter}'. YOU ARE AWESOME!!!`);
        }
        
    };
    //to allow users to enter Food
    const FoodPrompt = () => {
        const input = window.prompt(`Enter a Food starting with '${getLetter}':`);

        //does checking if it starts with correct letter
        if (input && input[0].toUpperCase() !== getLetter.toUpperCase()) {
            alert(`INCORRECT - '${input}' does not start with '${getLetter}'. Please try again and don't give up!`);
        } else if (input) {
            alert(`Yes!!!! '${input}' starts with '${getLetter}'. LETS GO SUPERSTAR!!!`);
        }
        
    };

    //to allow users to enter thing
    const thingPrompt = () => {
        const input = window.prompt(`Enter a thing starting with '${getLetter}':`);

        //does checking if it starts with correct letter
        if (input && input[0].toUpperCase() !== getLetter.toUpperCase()) {
            alert(`INCORRECT - '${input}' does not start with '${getLetter}'. Please try again and don't give up!`);
        } else if (input) {
            alert(`WOWZA!!!! '${input}' starts with '${getLetter}'.`);
        }
        
    };

    //submit button which stops time
    const handleSubmit = () => {
        
        clearInterval(timerInterval); // Stop the timer
        alert("Round Over - Stopping clock ");
    };

    return (
        <Layout>
            <div>
                <p style={{ color: "black", fontSize: "30px", textAlign: "center" }}>
                🧩 Letter Match
                </p>
                
                <p style={{ color: "black", fontSize: "20px", textAlign: "left" }}>
                Click to pick a letter or type Random for a surprise letter:
                </p>

                <button onClick={handlePrompt} style={{ backgroundColor: "blue", color: "black" }}>Letter Button</button>

                <p style={{ color: "black", textAlign: "center" }}>
                    Selected Letter: {getLetter}
                </p>

                <p style={{ color: "red", fontSize: "20px", textAlign: "center" }}>
                Time Left: {timeLimit} seconds
                </p>


                <button onClick={namePrompt} style={{ backgroundColor: "blue", color: "white" }}>Type a Name</button>
                <button onClick={placePrompt} style={{ backgroundColor: "blue", color: "white" }}>Type a Geographical Location</button>
                <button onClick={animalPrompt} style={{ backgroundColor: "blue", color: "white" }}>Type an Animal</button>
                <button onClick={FoodPrompt} style={{ backgroundColor: "blue", color: "white" }}>Type a Food</button>
                <button onClick={thingPrompt} style={{ backgroundColor: "blue", color: "white" }}>Type a thing</button> 

            
                <p style={{ color: "black", fontSize: "20px", textAlign: "left" }}>
                Click when done, before time runs out: 
                </p>
                <button onClick={handleSubmit} style={{ backgroundColor: "blue", color: "white", marginTop: "3px", marginBottom: "10px" }}>Submit</button>
    

            

                
                



            </div>
        </Layout>
    );
};

export default LM_singlePlayer; 
