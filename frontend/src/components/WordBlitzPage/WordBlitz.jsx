import React, { useState, useEffect } from "react";
import "./WordBlitz.css";
import Layout from "../Layout/Layout";

// API URL
const API_URL = "http://localhost:5000";       // Your main API root
const API_BASE_URL = `${API_URL}/word_blitz`; // WordBlitz endpoints

const WordBlitz = () => {
  // Logged-in user
  const [loggedInUser, setLoggedInUser] = useState("");

  // Basic game states
  const [room, setRoom] = useState("");
  const [gameType, setGameType] = useState("WordBlitzLocal"); // or WordBlitzOnline
  const [timeLimit, setTimeLimit] = useState(60);

  // If local game, we collect player names
  const [playerNames, setPlayerNames] = useState([""]);

  // Are we the creator of an online game? (Only the creator can set time limit/start game)
  const [isCreator, setIsCreator] = useState(false);

  // Once we've successfully created or joined a game, we set inRoom=true
  const [inRoom, setInRoom] = useState(false);

  // Game info
  const [status, setStatus] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [players, setPlayers] = useState([]); // list of {username, score} or just usernames

  // For showing open (unstarted) games if user wants to join one
  const [openGames, setOpenGames] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customSetName, setCustomSetName] = useState("");
  const [customQuestions, setCustomQuestions] = useState(Array(10).fill(""));
  // ----------------------------------------------------------------------------
  // 1. On mount, fetch the currently logged-in user
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found – user not logged in");
        return;
      }
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setLoggedInUser(data.username);
        } else {
          console.error("Error fetching user");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  // ----------------------------------------------------------------------------
  // 2. Periodically poll the current game state if we are actually "in" a game
  //    (i.e., after creation/join has succeeded)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    let intervalId;

    if (inRoom) {
      // Poll every 3 seconds
      intervalId = setInterval(() => {
        fetchGameState();
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [inRoom]);

  // ----------------------------------------------------------------------------
  // 3. Fetch open (unstarted) online WordBlitz games (for joining)
  // ----------------------------------------------------------------------------
  const fetchOpenGames = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/open_games`);
      const data = await res.json();
      if (data.open_games) {
        setOpenGames(data.open_games);
      } else if (data.error) {
        setStatus(`❌ ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Error fetching open games.");
    }
  };

  // ----------------------------------------------------------------------------
  // 4. Get current game state
  // ----------------------------------------------------------------------------
  const fetchGameState = async () => {
    // Only fetch if we have a room *and* we are inRoom
    if (!room || !inRoom) return;

    try {
      const res = await fetch(`${API_BASE_URL}/get_state?room=${room}`);
      const data = await res.json();

      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setGameStarted(data.started);
        setTimeLeft(data.time_left);

        // If your backend returns a list of usernames only:
        //   data.players might be ["alice", "bob"] 
        // If it returns objects with {username, score}, just store them directly.
        if (Array.isArray(data.players)) {
          // Suppose we only have a list of usernames
          setPlayers(data.players.map((u) => ({ username: u, score: 0 })));
        } else {
          // If it's an array of objects with {username, score}, do:
          setPlayers(data.players);
        }

        if (data.started && data.questions) {
          setQuestions(data.questions);

          // Initialize answers structure
          const initAnswers = {};
          data.questions.forEach((q) => {
            if (!initAnswers[q.question_id]) {
              initAnswers[q.question_id] = "";
            }
          });
          setAnswers((prev) => ({ ...initAnswers, ...prev }));
        }
      }
    } catch (error) {
      console.error(error);
      setStatus("❌ Failed to fetch state");
    }
  };

  // ----------------------------------------------------------------------------
  // 5. Create Game
  // ----------------------------------------------------------------------------
  const createGame = async () => {
    if (!room) return setStatus("❌ Please enter a room name!");

    if (gameType === "WordBlitzOnline" && !loggedInUser) {
      return setStatus("❌ You must be logged in to create an online game!");
    }

    let payload;
    if (gameType === "WordBlitzLocal") {
      payload = {
        room,
        game_type: "WordBlitzLocal",
        player_names: playerNames.filter((n) => n.trim() !== ""),
        time_limit: parseInt(timeLimit, 10),
      };
    } else {
      payload = {
        room,
        game_type: "WordBlitzOnline",
        creator_username: loggedInUser,
        time_limit: parseInt(timeLimit, 10),
      };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        setIsCreator(true);   // We created the game
        setInRoom(true);      // We are now "in" that room
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  // ----------------------------------------------------------------------------
  // 6. Join an existing online game
  // ----------------------------------------------------------------------------
  const joinExistingGame = async (selectedRoom) => {
    if (!loggedInUser) {
      return setStatus("❌ You must be logged in to join an online game!");
    }
    try {
      const res = await fetch(`${API_BASE_URL}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: selectedRoom, username: loggedInUser }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        setRoom(selectedRoom);
        setIsCreator(false);
        setInRoom(true);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  // ----------------------------------------------------------------------------
  // 7. Start the game (creator only)
  // ----------------------------------------------------------------------------
  const startGame = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, username: loggedInUser }),
      });
      const data = await res.json();

      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        setGameStarted(true);
        setQuestions(data.questions || []);
        setTimeLeft(data.time_limit);

        // Initialize answers
        const initAnswers = {};
        (data.questions || []).forEach((q) => {
          initAnswers[q.question_id] = "";
        });
        setAnswers(initAnswers);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  // ----------------------------------------------------------------------------
  // 8. Submit all answers
  // ----------------------------------------------------------------------------
  const submitAllAnswers = async () => {
    if (!questions.length) {
      return setStatus("❌ No questions to answer.");
    }

    // Basic check: Ensure no empty answers
    for (const q of questions) {
      if (!answers[q.question_id] || !answers[q.question_id].trim()) {
        setStatus(`❌ Please answer all questions before submitting. Missing question ID ${q.question_id}`);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/submit_all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          username: loggedInUser,
          answers,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        // Optionally update UI with data.results or data.score
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };
  // ----------------------------------------------------------------------------
  // 9. Submit Custom Questions
  // ----------------------------------------------------------------------------

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

  // ----------------------------------------------------------------------------
  // RENDERING
  // ----------------------------------------------------------------------------
  return (
    <Layout>
        <div className="word-blitz-container">
        <h1>🔥 WordBlitz</h1>

        {/* 
            If we have NOT created or joined a game yet, we can: 
            - Create a new game (local or online)
            - or (if online) join an existing open game
        */}
        {!inRoom && (
            <div style={{ margin: "10px 0", color: "black" }}>
            <h2>Create a Game</h2>
            <div style={{ marginBottom: "10px" }}>
                <label>
                <input
                    type="radio"
                    value="WordBlitzLocal"
                    checked={gameType === "WordBlitzLocal"}
                    onChange={() => setGameType("WordBlitzLocal")}
                />
                Local
                </label>
                <label style={{ marginLeft: "20px" }}>
                <input
                    type="radio"
                    value="WordBlitzOnline"
                    checked={gameType === "WordBlitzOnline"}
                    onChange={() => setGameType("WordBlitzOnline")}
                />
                Online
                </label>
            </div>

            {/* ROOM input */}
            <input
                type="text"
                placeholder="Enter Room Name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
            />

            {/* If local, collect player names */}
            {gameType === "WordBlitzLocal" && (
                <div style={{ marginTop: "10px" }}>
                <p>Enter Player Names (local, same device):</p>
                {playerNames.map((pname, index) => (
                    <input
                    key={index}
                    type="text"
                    style={{ display: "block", margin: "5px 0" }}
                    value={pname}
                    onChange={(e) => {
                        const arr = [...playerNames];
                        arr[index] = e.target.value;
                        setPlayerNames(arr);
                    }}
                    />
                ))}
                <button
                    onClick={() => setPlayerNames([...playerNames, ""])}
                    style={{ margin: "5px 0" }}
                >
                    Add Player
                </button>
                </div>
            )}

            {/* Only the creator sets time limit */}
            <div style={{ marginTop: "10px" }}>
                <label style={{ marginRight: "5px" }}>Time Limit (seconds):</label>
                <input
                type="number"
                min="10"
                max="300"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                />
            </div>

            <button onClick={createGame} style={{ marginTop: "10px" }}>
                Create Game
            </button>
            </div>
        )}

        {/* If user wants to join an existing online game, show open games */}
        {!inRoom && gameType === "WordBlitzOnline" && (
            <div style={{ margin: "10px 0", color: "black" }}>
            <h2>Join an Existing Online Game</h2>
            <button onClick={fetchOpenGames} style={{ marginBottom: "5px" }}>
                Refresh Open Games
            </button>
            {openGames.length === 0 ? (
                <p>No open games found.</p>
            ) : (
                <ul>
                {openGames.map((g) => (
                    <li key={g.game_id} style={{ margin: "5px 0",color: "black"  }}>
                    Room: <strong>{g.room}</strong> (Players waiting: {g.players.length})
                    <button
                        onClick={() => joinExistingGame(g.room)}
                        style={{ marginLeft: "10px" }}
                    >
                        Join
                    </button>
                    </li>
                ))}
                </ul>
            )}
            </div>
        )}



         {/* Add Custom Questions Button (Only show before joining a game) */}
         {!inRoom  && (
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




        {/* Waiting Room (if inRoom but not started) */}
        {inRoom && !gameStarted && (
            <div style={{ marginTop: "20px",color: "black"  }}>
            <h2>Waiting Room: {room}</h2>
            <p>Players in this game:</p>
            <ul>
                {players.map((p, i) => (
                <li key={i}>
                    {p.username || p}
                </li>
                ))}
            </ul>

            {/* Only the creator can start the game (online mode) */}
            {isCreator && gameType === "WordBlitzOnline" && (
                <button onClick={startGame} style={{ marginTop: "10px"}}>
                Start Game
                </button>
            )}
            </div>
        )}

        {/* Game Started */}
        {gameStarted && (
            <div style={{ marginTop: "20px" ,color: "black" }}>
            <h2>Room: {room}</h2>
            <h3>Time Left: {timeLeft}</h3>

            <h4>Players:</h4>
            <ul>
                {players.map((p, i) => (
                <li key={i}>
                    {p.username} - Score: {p.score}
                </li>
                ))}
            </ul>

            <div className="question-list">
                {questions.map((q) => (
                <div key={q.question_id} className="question-box">
                    <p>{q.prompt} (Starts with {q.letter})</p>
                    <input
                    type="text"
                    className="word-input"
                    value={answers[q.question_id] || ""}
                    onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.question_id]: e.target.value }))
                    }
                    />
                </div>
                ))}
            </div>

            <button className="submit-button" onClick={submitAllAnswers}>
                Submit All Answers
            </button>
            </div>
        )}

        <p className="status-message">{status}</p>
        </div>
    </Layout>
  );
};

export default WordBlitz;
