import React, { useState, useEffect } from "react";
import "./WordBlitz.css";
import Layout from "../Layout/Layout";

// API URL
const API_URL = "http://localhost:5000";       // Your main API root
const API_BASE_URL = `${API_URL}/word_blitz`; // WordBlitz endpoints

const WordBlitz = () => {
  // Logged-in user (only used for online games)
  const [loggedInUser, setLoggedInUser] = useState("");

  // Basic game config
  const [room, setRoom] = useState("");
  const [gameType, setGameType] = useState("WordBlitzLocal"); // or WordBlitzOnline
  const [timeLimit, setTimeLimit] = useState(60);

  // Local game: collect multiple player names
  const [playerNames, setPlayerNames] = useState([""]);

  // True if we created or joined a game
  const [inRoom, setInRoom] = useState(false);

  // True if the game is actually started
  const [gameStarted, setGameStarted] = useState(false);

  // True if the time ran out or the game otherwise ended
  const [gameOver, setGameOver] = useState(false);

  // For online: only the creator can start the game
  const [isCreator, setIsCreator] = useState(false);

  // Current state
  const [status, setStatus] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  // 'players' can be array of { username, score }
  const [players, setPlayers] = useState([]);

  // If user wants to see a list of open (unstarted) online games
  const [openGames, setOpenGames] = useState([]);

  // For the "Add Custom Questions" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customSetName, setCustomSetName] = useState("");
  const [customQuestions, setCustomQuestions] = useState(Array(10).fill(""));

  // ----------------------------------------------------------------------------
  // 1. On mount, fetch the logged-in user (for online)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found – user not logged in (okay for local).");
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
          console.error("Error fetching user for online game.");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  // ----------------------------------------------------------------------------
  // 2. Periodically poll the current game state if we're "in" a room
  // ----------------------------------------------------------------------------
  useEffect(() => {
    let intervalId;
    if (inRoom && !gameOver) {
      intervalId = setInterval(() => {
        fetchGameState();
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [inRoom, gameOver]);

  // ----------------------------------------------------------------------------
  // 3. fetchGameState: load the status from the server
  // ----------------------------------------------------------------------------
  const fetchGameState = async () => {
    if (!room || !inRoom) return;

    try {
      const res = await fetch(`${API_BASE_URL}/get_state?room=${room}`);
      const data = await res.json();

      if (data.error) {
        setStatus("❌ " + data.error);
        return;
      }

      setGameStarted(data.started);
      setTimeLeft(data.time_left);

      // Convert players if the server returns only usernames
      if (Array.isArray(data.players)) {
        setPlayers(data.players.map((u) => ({ username: u, score: 0 })));
      } else {
        setPlayers(data.players);
      }

      // If the game is started, load questions
      if (data.started && data.questions) {
        setQuestions(data.questions);
        // Initialize any missing answers
        const initAnswers = {};
        data.questions.forEach((q) => {
          if (!initAnswers[q.question_id]) {
            initAnswers[q.question_id] = "";
          }
        });
        setAnswers((prev) => ({ ...initAnswers, ...prev }));
      }

      // If time runs out, mark gameOver
      if (data.started && data.time_left === 0) {
        setGameOver(true);
        setStatus("⏰ Time's up! Final scores shown below.");
      }
    } catch (error) {
      console.error(error);
      setStatus("❌ Failed to fetch state");
    }
  };

  // ----------------------------------------------------------------------------
  // 4. Create Game
  //    - For local: automatically start the game
  // ----------------------------------------------------------------------------
  const createGame = async () => {
    if (!room) return setStatus("❌ Please enter a room name!");
    if (gameType === "WordBlitzOnline" && !loggedInUser) {
      return setStatus("❌ You must be logged in to create an online game!");
    }

    const payload =
      gameType === "WordBlitzLocal"
        ? {
            room,
            game_type: "WordBlitzLocal",
            player_names: playerNames.filter((n) => n.trim() !== ""),
            time_limit: parseInt(timeLimit, 10),
          }
        : {
            room,
            game_type: "WordBlitzOnline",
            creator_username: loggedInUser,
            time_limit: parseInt(timeLimit, 10),
          };

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
        setIsCreator(true);
        setInRoom(true);

        // If local, automatically start the game
        if (gameType === "WordBlitzLocal") {
          // By your backend logic, the first local player is creator
          // We'll call the same /start route with that username
          const firstPlayerName = playerNames[0].trim() || "LocalHost";
          autoStartLocalGame(firstPlayerName);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  // Helper to auto-start local game after creation
  const autoStartLocalGame = async (creatorName) => {
    try {
      const res = await fetch(`${API_BASE_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, username: creatorName }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        setGameStarted(true);
        setQuestions(data.questions || []);
        setTimeLeft(data.time_limit);

        const initAnswers = {};
        (data.questions || []).forEach((q) => {
          initAnswers[q.question_id] = "";
        });
        setAnswers(initAnswers);
      }
    } catch (error) {
      console.error(error);
      setStatus("❌ Could not auto-start local game");
    }
  };

  // ----------------------------------------------------------------------------
  // 5. Join an existing online game
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
  // 6. Start the game (online creator only)
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
  // 7. Submit All Answers
  // ----------------------------------------------------------------------------
  const submitAllAnswers = async () => {
    if (!questions.length) {
      return setStatus("❌ No questions to answer.");
    }

    // Validate that all are filled
    for (const q of questions) {
      if (!answers[q.question_id] || !answers[q.question_id].trim()) {
        setStatus(`❌ Please answer all questions (missing question: ${q.question_id}).`);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/submit_all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          username: gameType === "WordBlitzLocal" 
            ? (players[0]?.username || "LocalHost") // or whichever player's turn it is
            : loggedInUser,
          answers,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        // You can update local scores or data.results if you want real-time scoring
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  // ----------------------------------------------------------------------------
  // 8. If the game is Over: let host decide to continue or not
  // ----------------------------------------------------------------------------
  const handleContinueGame = () => {
    // Because your backend doesn't provide a "new round" in the same room,
    // we simply reset states so the user can create or join another game.
    setStatus("Create or join a new game!");
    setInRoom(false);
    setGameStarted(false);
    setGameOver(false);
    setRoom("");
    setPlayers([]);
    setQuestions([]);
    setAnswers({});
  };

  // ----------------------------------------------------------------------------
  // 9. Submit Custom Questions
  // ----------------------------------------------------------------------------
  const submitCustomQuestions = async () => {
    if (!customSetName) {
      return setStatus("❌ Please enter a set name!");
    }
    try {
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
    } catch (error) {
      console.error(error);
      setStatus("❌ Server error while adding custom questions");
    }
  };

  // ----------------------------------------------------------------------------
  // RENDERING
  // ----------------------------------------------------------------------------
  return (
    <Layout>
      <div className="word-blitz-container">
        <h1>🔥 WordBlitz</h1>

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
                  <li key={g.game_id} style={{ margin: "5px 0", color: "black" }}>
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

        {/* Add Custom Questions Button (Only show if not in a room) */}
        {!inRoom && (
          <button
            className="add-questions-button"
            onClick={() => setIsModalOpen(true)}
            style={{ marginBottom: "10px" }}
          >
            ➕ Add Custom Questions
          </button>
        )}

        {/* Modal for Adding Custom Questions */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Create New Question Set</h2>
              <input
                type="text"
                placeholder="Set Name"
                value={customSetName}
                onChange={(e) => setCustomSetName(e.target.value)}
              />
              <div className="question-list">
                {customQuestions.map((q, index) => (
                  <div key={index} className="question-box">
                    <input
                      type="text"
                      placeholder={`Question ${index + 1}`}
                      value={q}
                      onChange={(e) => {
                        const newQuestions = [...customQuestions];
                        newQuestions[index] = e.target.value;
                        setCustomQuestions(newQuestions);
                      }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={submitCustomQuestions}>Submit Custom Questions</button>
              <button
                className="close-button"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Waiting Room (online only) */}
        {inRoom && !gameStarted && gameType === "WordBlitzOnline" && (
          <div style={{ marginTop: "20px", color: "black" }}>
            <h2>Waiting Room: {room}</h2>
            <p>Players in this game:</p>
            <ul>
              {players.map((p, i) => (
                <li key={i}>{p.username || p}</li>
              ))}
            </ul>
            {/* Only the creator can start the game */}
            {isCreator && (
              <button onClick={startGame} style={{ marginTop: "10px" }}>
                Start Game
              </button>
            )}
          </div>
        )}

        {/* Game in Progress */}
        {gameStarted && !gameOver && (
          <div style={{ marginTop: "20px", color: "black" }}>
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
                  <p>
                    {q.prompt} (Starts with {q.letter})
                  </p>
                  <input
                    type="text"
                    className="word-input"
                    value={answers[q.question_id] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.question_id]: e.target.value,
                      }))
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

        {/* Game Over Screen (time ran out) */}
        {gameOver && (
          <div style={{ marginTop: "20px", color: "black" }}>
            <h2>Time's Up! Final Scores:</h2>
            <ul>
              {players.map((p, i) => (
                <li key={i}>
                  {p.username} - Score: {p.score}
                </li>
              ))}
            </ul>
            {isCreator && (
              <button onClick={handleContinueGame} style={{ marginTop: "10px" }}>
                Play Again?
              </button>
            )}
          </div>
        )}

        <p className="status-message">{status}</p>
      </div>
    </Layout>
  );
};

export default WordBlitz;
