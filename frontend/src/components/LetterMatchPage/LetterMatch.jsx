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

    const removeLocalPlayer = (index) => {
        setLocalPlayers(prevVal => prevVal.filter((_, i) => i !== index));
    };

    return (
        <Layout>
            <p style={{ backgroundColor: 'var(--header-bg-color)', color: 'white', fontSize: '3rem', fontFamily: "'Comic Sans MS', sans-serif", textAlign: 'center' }}>
                Welcome to Letter Match 💌
            </p>

            <div className="letter-match-menu-container">
                {/* Instructions */}
                <div className="instruction_img">
                    <p>
                        ✨You get a letter ✨ <br /> 
                        ✨You must match that with: ✨ <br /> 
                        ✅ A Name, ✅ City or Country, ✅ Animal, <br />
                        ✅ Thing, ✅ Food <br /><br />
                        .. all starting with the same letter ✨
                    </p>
                </div>

                {/* Create a Game */}
                <div className="Create-game-banner">
                    <p> --- Create a Game 📝 --- </p>
                </div>

                <div className="game-mode-container">
                    <h1 style={{ color: "black" }}>🎮 Game Mode 🎮</h1>

                    {/* Radio buttons to select game mode */}
                    <div className="mode-selection">
                        <label>
                            <input 
                                type="radio" 
                                name="gameMode" 
                                value="single" 
                                checked={gameMode === "single"} 
                                onChange={() => setGameMode("single")} 
                            /> 
                            Play Single Player
                        </label>
                        <label>
                            <input 
                                type="radio" 
                                name="gameMode" 
                                value="online" 
                                checked={gameMode === "online"} 
                                onChange={() => setGameMode("online")} 
                            /> 
                            Play Online
                        </label>
                        <label>
                            <input 
                                type="radio" 
                                name="gameMode" 
                                value="local" 
                                checked={gameMode === "local"} 
                                onChange={() => setGameMode("local")} 
                            /> 
                            Local Multiplayer
                        </label>
                    </div>

                    {/* Game Setup */}
                    {gameMode && (
                        <div className="mode-selection">
                            {gameMode === "single" ? (
                                <>
                                    {/* Create Game button */}
                                    <button 
                                        style={{ backgroundColor: 'var(--header-bg-color)', color: 'white' }} 
                                        onClick={() => window.location.href = '/singlePlayer'} // goes to single player
                                    >
                                        Start Single Player Game
                                    </button>
                                </>
                            ) : gameMode === "local" ? (
                                <div>
                                 
                                    <input 
                                        type="text" 
                                        placeholder="Enter Player Name" 
                                        value={newLocalPlayer} 
                                        onChange={(e) => setNewLocalPlayer(e.target.value)} 
                                    />
                                    <button 
                                        onClick={addLocalPlayer} 
                                        style={{ backgroundColor: 'var(--header-bg-color)', color: "white" }}
                                    >
                                        Add Local Player
                                    </button>
                                    <ul>
                                        {localPlayers.map((p, index) => (
                                            <li key={index}>
                                                {p} 
                                                <button onClick={() => removeLocalPlayer(index)}>
                                                    Remove
                                                </button>
                                            </li>
                                        ))}
                                    </ul>

                                    <button 
                                        onClick={joinGame} 
                                        style={{ backgroundColor: 'var(--header-bg-color)', color: "white"}}
                                    >
                                        Create Game
                                    </button>
                                </div>
                            ) : gameMode === "online" ? (
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Room Name" 
                                        value={room} 
                                        onChange={(e) => setRoom(e.target.value)} 
                                    />
                                    <button 
                                        onClick={joinGame} 
                                        style={{ backgroundColor: 'var(--header-bg-color)', color: "white" }}
                                    >
                                        Join Online Game
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default LetterMatch;
