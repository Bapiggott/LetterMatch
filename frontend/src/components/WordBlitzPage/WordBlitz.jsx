import React, { useState, useEffect } from "react";
import "./WordBlitz.css";
import Layout from "../Layout/Layout";

const API_BASE_URL = "http://localhost:5000/word_blitz";

const WordBlitz = () => {
    const [room, setRoom] = useState("");
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [status, setStatus] = useState("");
    const [submittedResults, setSubmittedResults] = useState({});
    const [hasJoinedGame, setHasJoinedGame] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customSetName, setCustomSetName] = useState("");
    const [customQuestions, setCustomQuestions] = useState(Array(10).fill(""));

    useEffect(() => {
        if (room) {
            fetch(`${API_BASE_URL}/get_state?room=${room}`)
                .then(res => res.json())
                .then(data => {
                    if (data.questions) {
                        setQuestions(data.questions);
                        setAnswers(
                            data.questions.reduce((acc, q) => {
                                acc[q.id] = "";
                                return acc;
                            }, {})
                        );
                        setHasJoinedGame(true);
                    }
                })
                .catch(() => setStatus("❌ Failed to fetch game state"));
        }
    }, [room]);

    const createGame = async () => {
        if (!room) return setStatus("❌ Please enter a room name!");

        const response = await fetch(`${API_BASE_URL}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room }),
        });

        const data = await response.json();
        setStatus(data.message || data.error);
        setQuestions(data.questions || []);
        setAnswers({});
        setSubmittedResults({});
        setHasJoinedGame(true);
    };

    const submitAllAnswers = async () => {
        if (Object.values(answers).some(answer => answer.trim() === "")) {
            setStatus("❌ Please answer all 10 questions before submitting.");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/submit_all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, username: "Player1", answers }),
        });

        const data = await response.json();
        if (data.error) {
            setStatus("❌ " + data.error);
        } else {
            setSubmittedResults(data.results);
            setStatus("✅ All answers submitted!");
        }
    };

    const submitCustomQuestions = async () => {
        if (!customSetName) return setStatus("❌ Please enter a set name!");

        const response = await fetch(`${API_BASE_URL}/add_questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ set_name: customSetName, questions: customQuestions }),
        });

        const data = await response.json();
        setStatus(data.message || data.error);
        setIsModalOpen(false);
        setCustomSetName("");
        setCustomQuestions(Array(10).fill(""));
    };

    return (
        <Layout>
            <div className="word-blitz-container">
                <h1>🔥 WordBlitz</h1>

                {/* Game Room Input */}
                <div className="word-blitz-form">
                    <input
                        type="text"
                        placeholder="Enter Room Name"
                        value={room}
                        onChange={e => setRoom(e.target.value)}
                    />
                    <button onClick={createGame}>Create Game</button>
                </div>

                {/* Display Questions in a Grid Layout */}
                {hasJoinedGame && (
                    <div className="question-list">
                        {questions.map(q => (
                            <div key={q.id} className="question-box">
                                <p>{q.prompt} (Must start with {q.letter})</p>
                                <input
                                    type="text"
                                    className="word-input"
                                    value={answers[q.id] || ""}
                                    onChange={(e) =>
                                        setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))
                                    }
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Submit All Button (Only show if game has started) */}
                {hasJoinedGame && (
                    <button className="submit-button" onClick={submitAllAnswers}>
                        Submit All Answers
                    </button>
                )}

                {/* Add Custom Questions Button (Only show before joining a game) */}
                {!hasJoinedGame && (
                    <button className="add-questions-button" onClick={() => setIsModalOpen(true)}>
                        ➕ Add Custom Questions
                    </button>
                )}

                {/* Modal for Adding Questions */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2>Create New Question Set</h2>
                            <input 
                                type="text" 
                                placeholder="Set Name" 
                                value={customSetName} 
                                onChange={e => setCustomSetName(e.target.value)} 
                            />
                            <div className="question-list">
                                {customQuestions.map((q, index) => (
                                    <div key={index} className="question-box">
                                        <input 
                                            type="text" 
                                            placeholder={`Question ${index + 1}`}
                                            value={q}
                                            onChange={e => {
                                                const newQuestions = [...customQuestions];
                                                newQuestions[index] = e.target.value;
                                                setCustomQuestions(newQuestions);
                                            }} 
                                        />
                                    </div>
                                ))}
                            </div>
                            <button onClick={submitCustomQuestions}>Submit Custom Questions</button>
                            <button className="close-button" onClick={() => setIsModalOpen(false)}>Close</button>
                        </div>
                    </div>
                )}

                <p className="status-message">{status}</p>
            </div>
        </Layout>
    );
};

export default WordBlitz;
