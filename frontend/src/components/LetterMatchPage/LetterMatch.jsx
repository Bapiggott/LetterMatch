import React, { useState, useEffect } from "react";
import "./LetterMatch.css";
import Layout from "../Layout/Layout";

const API_BASE_URL = "http://localhost:5000/letter_match";

const LetterMatch = () => {
    const [room, setRoom] = useState("");
    const [players, setPlayers] = useState([]);
    const [letterMatch, setLetterMatch] = useState([]);
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

    const submitWord = async () => {
        const wordInput = document.getElementById("wordInput").value.trim();
        if (!wordInput) {
            setStatus("❌ Please enter a word!");
            return;
        }

        const username = gameMode === "local" ? localPlayers[0] || "Guest" : "RegisteredUser"; 

        const response = await fetch(`${API_BASE_URL}/submit_word`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, word: wordInput, username }),
        });

        const data = await response.json();
        if (data.error) {
            setStatus(`❌ ${data.error}`);
        } else {
            setLetterMatch(prev => [...prev, data.word]);
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
            <div className="letter-match-container">
                <h1>🔗 Letter Match Game</h1>
                <button>Test Button</button>
            </div>
        </Layout>
    );
    
}
    

export default LetterMatch;
