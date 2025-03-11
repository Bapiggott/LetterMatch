
import React from 'react';
import Layout from '../Layout/Layout';
import './LM_SinglePlayer.css'


const LM_singlePlayer = () => {
    let userInput = ""; // allows user to input something
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    const handlePrompt = () => {
        const input = window.prompt("Enter a letter or type 'Random' for a random letter: "); 
        if (input !== null && input.length === 1 && letters.includes(input.toUpperCase())) { //if user types a ;etter
            userInput = input.toUpperCase();
            alert(userInput + " is your letter")
        }
        else if (input === "random" || input === "Random" || input === "RANDOM" ) //selects random letter
        {
            //generates random letter
            const randomLetter = letters[Math.floor(Math.random() * letters.length)];

            //notify user on letter
            alert(randomLetter + " is your letter");
        }
        else //if user enters number, symbol, or multiple letters
        {
            alert("Not a valid letter");
        }


        //gameplay

        //start countdown timer

        //game end -- compare stats 





        
    };

    

            

        

    


    return (
        <Layout>
            <div>
                <button onClick={handlePrompt}>Letter Button</button>
                
            </div>
        </Layout>
    );
};

export default LM_singlePlayer;
