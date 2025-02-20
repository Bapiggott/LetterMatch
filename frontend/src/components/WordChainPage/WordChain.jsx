// WordChain.jsx
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import './WordChain.css';
import Layout from '../Layout/Layout';

const socket = io('http://localhost:5000');

const WordChain = () => {
    const [room, setRoom] = useState("");
    const [username, setUsername] = useState("");
    const [players, setPlayers] = useState([]);
    const [wordChain, setWordChain] = useState([]);
    const [status, setStatus] = useState("");

    useEffect(() => {
        socket.on("game_created", () => {
            setStatus("✅ Game created! Waiting for players...");
        });

        socket.on("player_joined", (data) => {
            setPlayers(data.players);
        });

        socket.on("word_accepted", (data) => {
            setWordChain(prev => [...prev, data.word]);
            setStatus(`Next turn: ${data.turn}`);
        });

        socket.on("word_rejected", (data) => {
            setStatus(`❌ ${data.message}`);
        });

        return () => {
            socket.off("game_created");
            socket.off("player_joined");
            socket.off("word_accepted");
            socket.off("word_rejected");
        };
    }, []);

    const createGame = () => {
        socket.emit("create_game", { room });
    };

    const joinGame = () => {
        socket.emit("join_game", { room, username });
    };

    const submitWord = (word) => {
        socket.emit("submit_word", { room, word, username });
    };

    return (
        <Layout>
            <div className="word-chain-container">
                <h1>🔗 Word Chain Game</h1>
    
                <input type="text" placeholder="Enter Room Name" onChange={(e) => setRoom(e.target.value)} />
                <input type="text" placeholder="Enter Username" onChange={(e) => setUsername(e.target.value)} />
    
                <button onClick={createGame}>Create Game</button>
                <button onClick={joinGame}>Join Game</button>
    
                <h2>👥 Players:</h2>
                <ul>{players.map((p, index) => <li key={index}>{p}</li>)}</ul>
    
                <h2>🔗 Word Chain:</h2>
                <p>{wordChain.length > 0 ? wordChain.join(" → ") : "Start the game by submitting a word."}</p>
    
                <input type="text" placeholder="Enter a word" id="wordInput" />
                <button onClick={() => submitWord(document.getElementById("wordInput").value)}>Submit</button>
    
                <p>{status}</p>
            </div>
        </Layout>
    );
};

export default WordChain;
