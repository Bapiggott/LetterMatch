import React, { useState, useEffect } from "react";
import "./WordChain.css";
import Layout from "../Layout/Layout";

const API_BASE_URL = "http://localhost:5000/word_chain";

const WordChain = () => {
    const [room, setRoom] = useState("");
    const [players, setPlayers] = useState([]);
    const [wordChain, setWordChain] = useState([]);
    const [status, setStatus] = useState("");
    const [gameMode, setGameMode] = useState(""); // "local" or "online"
    const [localPlayers, setLocalPlayers] = useState([]);
    const [newLocalPlayer, setNewLocalPlayer] = useState("");

    useEffect(() => {
        if (room) {
            fetch(`${API_BASE_URL}/get_state?room=${room}`)
                .then(res => res.json())
                .then(data => {
                    if (data.players) setPlayers(data.players);
                    if (data.wordChain) setWordChain(data.wordChain);
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

    const submitWord = async () => {
        const wordInput = document.getElementById("wordInput").value.trim();
        if (!wordInput) {
            setStatus("❌ Please enter a word!");
            return;
        }

        const username = gameMode === "local" ? localPlayers[0] || "Guest" : "RegisteredUser"; // Placeholder for authentication

        const response = await fetch(`${API_BASE_URL}/submit_word`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, word: wordInput, username }),
        });

        const data = await response.json();
        if (data.error) {
            setStatus(`❌ ${data.error}`);
        } else {
            setWordChain(prev => [...prev, data.word]);
            setStatus(`✅ Word accepted! Next turn.`);
        }
    };

    const addLocalPlayer = () => {
        if (newLocalPlayer && !localPlayers.includes(newLocalPlayer)) {
            setLocalPlayers([...localPlayers, newLocalPlayer]);
            setNewLocalPlayer("");
        }
    };

    return (
        <Layout>
            <div className="word-chain-container">
                <h1>🔗 Word Chain Game</h1>

                <div className="mode-selection">
                    <button onClick={() => setGameMode("online")}>Play Online</button>
                    <button onClick={() => setGameMode("local")}>Local Multiplayer</button>
                </div>

                {gameMode && (
                    <div className="game-setup">
                        <input type="text" placeholder="Enter Room Name" value={room} onChange={(e) => setRoom(e.target.value)} />
                        
                        {gameMode === "local" ? (
                            <div>
                                <input type="text" placeholder="Enter Player Name" value={newLocalPlayer} onChange={(e) => setNewLocalPlayer(e.target.value)} />
                                <button onClick={addLocalPlayer}>Add Local Player</button>
                                <ul>{localPlayers.map((p, index) => <li key={index}>{p}</li>)}</ul>
                            </div>
                        ) : (
                            <button onClick={joinGame}>Join Online Game</button>
                        )}

                        <button onClick={createGame}>Create Game</button>
                    </div>
                )}

                <h2>👥 Players:</h2>
                <ul>{players.map((p, index) => <li key={index}>{p}</li>)}</ul>

                <h2>🔗 Word Chain:</h2>
                <p>{wordChain.length > 0 ? wordChain.join(" → ") : "Start the game by submitting a word."}</p>

                <input type="text" placeholder="Enter a word" id="wordInput" />
                <button onClick={submitWord}>Submit</button>

                <p className="status-message">{status}</p>
            </div>
        </Layout>
    );
};

export default WordChain;
