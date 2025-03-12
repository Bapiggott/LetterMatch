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
        if (gameStart && timeLimit > 0) {
            const timer = setInterval(() => {
                setTimeLimit((prevTime) => prevTime - 1);
            }, 1000); // Decrements every second

            return () => clearInterval(timer);
        }
        if (timeLimit === 0) {
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
        } else if (input.toLowerCase() === "random") {
            const randomLetter = letters[Math.floor(Math.random() * letters.length)];
            setGetLetter(randomLetter);
            alert(randomLetter + " is your letter");
        } else {
            alert("Not a valid letter");
        }
    };

    return (
        <div>
            <button onClick={handlePrompt}>Letter Button</button>
            <p style={{ color: "white", textAlign: "center" }}>
                Selected Letter: {getLetter}
            </p>

            <p style={{ color: "red", fontSize: "20px", textAlign: "center" }}>
            Time Left: {timeLimit} seconds
            </p>
        </div>
    );
};

export default LM_singlePlayer;