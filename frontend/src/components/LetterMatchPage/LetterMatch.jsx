import React, { useState, useEffect } from "react";
import "./LetterMatch.css";
import Layout from "../Layout/Layout.jsx";
import { useNavigate } from "react-router-dom";
import LM_singlePlayer from './LM_singlePlayer.jsx';

const API_BASE_URL = "http://localhost:5000/letter_match";

const LetterMatch = () => {
    const [room, setRoom] = useState("");
    const [players, setPlayers] = useState([]);
    const [letterMatch, setLetterMatch] = useState([]);
    const [status, setStatus] = useState("");
    const [gameMode, setGameMode] = useState(""); 
    const [localPlayers, setLocalPlayers] = useState([]);
    const [newLocalPlayer, setNewLocalPlayer] = useState("");

    const navigate = useNavigate(); 

    useEffect(() => {
        if (room) {
            fetch(`${API_BASE_URL}/get_state?room=${room}`)
                .then(res => res.json())
                .then(data => {
                    if (data.players) setPlayers(data.players);
                    if (data.letterMatch) setLetterMatch(data.letterMatch);
                })
                .catch(() => setStatus("❌ Failed to fetch game state"));
        }
    }, [room]);

    const createGame = async () => {
        if (!room) {
            setStatus("❌ Please enter a room name!");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room }),
        });

        const data = await response.json();
        setStatus(data.message || data.error);
        if (!data.error) setPlayers([]);
    };

    const joinGame = async () => {
        if (!room) {
            setStatus("❌ Please enter a room name!");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room }),
        });

        const data = await response.json();
        setPlayers(data.players || []);
        setStatus(data.message || data.error);
    };




    const addLocalPlayer = () => {
        if (newLocalPlayer && !localPlayers.includes(newLocalPlayer)) {
            setLocalPlayers([...localPlayers, newLocalPlayer]);
            setNewLocalPlayer("");
        }
    };


    //helps to remove local player in case if a local user changes their mind 
    const removeLocalPlayer = (index) => {
        setLocalPlayers(prevVal => prevVal.filter((_,i) => i != index));
        
    };



    return (
        <Layout>
            <div className="letter-match-container">
                <h1 style={{ color: "white" }}>🔗 Letter Match Game</h1>
                <div className="mode-selection">
                    <button onClick={() => setGameMode("single")}>Play Single Player</button>
                    <button onClick={() => setGameMode("online")}>Play Online</button>
                    <button onClick={() => setGameMode("local")}>Local Multiplayer</button>
                </div>

                {gameMode && (
                    <div className="game-setup">

                       
                     {gameMode === "single" ? (
                            <a href="/singlePlayer">Start Single Player Game </a>
                          
                        ): gameMode === "local" ? (
                            <div>
                                <input type="text" placeholder="Enter Room Name" value={room} onChange={(e) => setRoom(e.target.value)} />
                                <input type="text" placeholder="Enter Player Name" value={newLocalPlayer} onChange={(e) => setNewLocalPlayer(e.target.value)} />
                                <button onClick={addLocalPlayer}>Add Local Player</button>
                                <ul>{localPlayers.map((p, index) => <li key={index}>{p} <button onClick={() => removeLocalPlayer(index)}>Remove</button></li>)}</ul>
               
                            </div>
                        ) : (
                            <button onClick={joinGame}>Join Online Game</button>
                        )}

                      

                        <button onClick={createGame}>Create Game</button>
                    </div>
                )}
            </div>
        </Layout>
    );
    
}
    

export default LetterMatch;