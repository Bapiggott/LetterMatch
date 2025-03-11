import React, { useState, useEffect } from "react";
import "./WordBlitz.css";
import Layout from "../Layout/Layout";

const API_URL = "http://localhost:5000";
const API_BASE_URL = `${API_URL}/word_blitz`;

const WordBlitz = () => {
  // Logged-in user (for online)
  const [loggedInUser, setLoggedInUser] = useState("");

  // Basic game config
  const [room, setRoom] = useState("");
  const [gameType, setGameType] = useState("WordBlitzLocal"); // or "WordBlitzOnline"
  const [timeLimit, setTimeLimit] = useState(60);

  // Local players typed in UI
  const [playerNames, setPlayerNames] = useState([""]);

  // True if we created or joined a game
  const [inRoom, setInRoom] = useState(false);

  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // For online only: are we the host?
  const [isCreator, setIsCreator] = useState(false);

  // Current status + questions + answers
  const [status, setStatus] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  // players[] = array of { username, score }
  const [players, setPlayers] = useState([]);

  // Index of the local player whose turn it is
  const [currentLocalPlayerIndex, setCurrentLocalPlayerIndex] = useState(0);
  // Local countdown for the current player’s turn
  const [localTimeLeft, setLocalTimeLeft] = useState(timeLimit);

  // For listing open online games
  const [openGames, setOpenGames] = useState([]);

  // For custom question sets
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customSetName, setCustomSetName] = useState("");
  const [customQuestions, setCustomQuestions] = useState(Array(10).fill(""));

  // --------------------------------------------------------------------------
  // 1. On mount, fetch logged-in user (for online)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        return; // not logged in = fine for local
      }
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setLoggedInUser(data.username);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // --------------------------------------------------------------------------
  // 2. "Local" Turn Timer: each local player gets "timeLimit" seconds
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (gameType !== "WordBlitzLocal") return; // skip for online
    if (!gameStarted || gameOver) return;      // skip if not in local game

    const intervalId = setInterval(() => {
      setLocalTimeLeft((prev) => {
        if (prev <= 1) {
          // Time’s up for the current player
          clearInterval(intervalId);
          // Auto-submit for this player
          submitAllAnswers(true); // pass a param so we know it’s auto
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameType, gameStarted, gameOver, currentLocalPlayerIndex]);

  // --------------------------------------------------------------------------
  // 3. For ONLINE: poll server for "time_left" etc.
  // --------------------------------------------------------------------------
  useEffect(() => {
    let pollId;
    if (inRoom && gameType === "WordBlitzOnline" && !gameOver) {
      pollId = setInterval(() => {
        fetchGameState();
      }, 3000);
    }
    return () => {
      if (pollId) clearInterval(pollId);
    };
  }, [inRoom, gameOver, gameType]);

  // --------------------------------------------------------------------------
  // fetchGameState (ONLINE only) – local we handle entirely in front end
  // --------------------------------------------------------------------------
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
      setPlayers(data.players || []); // e.g. [ {username, score}, ... ]

      // If started, load questions
      if (data.started && data.questions) {
        setQuestions(data.questions);
        const initAns = {};
        data.questions.forEach((q) => {
          initAns[q.question_id] = "";
        });
        setAnswers((old) => ({ ...initAns, ...old }));
      }

      if (data.started && data.time_left === 0) {
        // Time ended on server side => game over
        setGameOver(true);
        setStatus("⏰ Time's up! Final scores shown below.");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to fetch state");
    }
  };

  // --------------------------------------------------------------------------
  // 4. CREATE GAME
  // --------------------------------------------------------------------------
  const createGame = async () => {
    if (!room) {
      return setStatus("❌ Please enter a room name!");
    }
    if (gameType === "WordBlitzOnline" && !loggedInUser) {
      return setStatus("❌ Must be logged in for online game!");
    }

    const payload =
      gameType === "WordBlitzLocal"
        ? {
            room,
            game_type: "WordBlitzLocal",
            player_names: playerNames.filter((p) => p.trim() !== ""),
            time_limit: parseInt(timeLimit, 10),
          }
        : {
            room,
            game_type: "WordBlitzOnline",
            creator_username: loggedInUser,
            time_limit: parseInt(timeLimit, 10),
          };

    try {
      const resp = await fetch(`${API_BASE_URL}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        setIsCreator(true);
        setInRoom(true);

        // If local, auto-start
        if (gameType === "WordBlitzLocal") {
          const firstName = playerNames[0].trim() || "LocalHost";
          autoStartLocalGame(firstName);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error while creating game");
    }
  };

  // Start a local game by calling /start with first player's username
  const autoStartLocalGame = async (creatorName) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, username: creatorName }),
      });
      const data = await resp.json();
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        setGameStarted(true);

        setQuestions(data.questions || []);
        // Now let's fetch the actual players from the server
        // to ensure we have their correct names
        const gameStateResp = await fetch(`${API_BASE_URL}/get_state?room=${room}`);
        const gameStateData = await gameStateResp.json();
        if (!gameStateData.error) {
          setPlayers(gameStateData.players || []);
        }
        
        // Start the local turn system
        setCurrentLocalPlayerIndex(0);
        setLocalTimeLeft(timeLimit);

        // Make answers object
        const initAns = {};
        (data.questions || []).forEach((q) => {
          initAns[q.question_id] = "";
        });
        setAnswers(initAns);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Could not auto-start local");
    }
  };

  // --------------------------------------------------------------------------
  // 5. JOIN an Existing Online Game
  // --------------------------------------------------------------------------
  const fetchOpenGames = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/open_games`);
      const data = await resp.json();
      if (data.open_games) {
        setOpenGames(data.open_games);
      } else if (data.error) {
        setStatus("❌ " + data.error);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Error fetching open games");
    }
  };

  const joinExistingGame = async (selectedRoom) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: selectedRoom, username: loggedInUser }),
      });
      const data = await resp.json();
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
      setStatus("❌ Server error while joining");
    }
  };

  // --------------------------------------------------------------------------
  // 6. START (Online Only)
  // --------------------------------------------------------------------------
  const startGame = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, username: loggedInUser }),
      });
      const data = await resp.json();
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        setGameStarted(true);
        // We'll poll get_state to see questions/time left
        fetchGameState();
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error while starting");
    }
  };

  // --------------------------------------------------------------------------
  // 7. SUBMIT answers
  //    In local mode, we pass the "currentLocalPlayerIndex" player's name
  // --------------------------------------------------------------------------
  const submitAllAnswers = async (autoFromTimer = false) => {
    if (!questions.length) {
      return setStatus("❌ No questions to answer.");
    }

    // If local, we use the "currentLocalPlayerIndex" to find the correct name
    let localPlayerName = "";
    if (gameType === "WordBlitzLocal") {
      const p = players[currentLocalPlayerIndex];
      if (!p) {
        console.warn("No player found at index", currentLocalPlayerIndex);
        return;
      }
      localPlayerName = p.username;
    }

    // If not autoFromTimer, check if all fields are filled
    // (If time ran out, we might skip this check or partial is 0.)
    if (!autoFromTimer && gameType === "WordBlitzLocal") {
      for (const q of questions) {
        if (!answers[q.question_id] || !answers[q.question_id].trim()) {
          setStatus(`❌ Please fill all answers before submitting!`);
          return;
        }
      }
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/submit_all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          username: gameType === "WordBlitzLocal" ? localPlayerName : loggedInUser,
          answers,
        }),
      });
      const data = await resp.json();
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setStatus("✅ " + data.message);
        // If local => end the turn & go to next player
        if (gameType === "WordBlitzLocal") {
          // Reload scores from the server
          await reloadPlayersScores();
          advanceLocalTurn();
        } else {
          // Online => just poll state to see updated scores
          fetchGameState();
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error submitting answers");
    }
  };

  // Reload just the players/scores from get_state
  const reloadPlayersScores = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/get_state?room=${room}`);
      const data = await resp.json();
      if (!data.error && data.players) {
        setPlayers(data.players);
      }
    } catch (err) {
      console.error("Error reloading players:", err);
    }
  };

  // Move to next local player or end if that was last
  const advanceLocalTurn = () => {
    const nextIndex = currentLocalPlayerIndex + 1;
    if (nextIndex >= players.length) {
      // All players have gone => game over
      setGameOver(true);
      setStatus("All local players finished! Final scores below.");
      // Optionally reload final scoreboard
      reloadPlayersScores();
    } else {
      // Move to next player
      setCurrentLocalPlayerIndex(nextIndex);
      setLocalTimeLeft(timeLimit);
      // Clear answers
      const blankAnswers = {};
      questions.forEach((q) => {
        blankAnswers[q.question_id] = "";
      });
      setAnswers(blankAnswers);
      setStatus(`Now it's ${players[nextIndex].username}'s turn!`);
    }
  };

  // --------------------------------------------------------------------------
  // 8. GAME OVER => "Play Again?"
  // --------------------------------------------------------------------------
  const handleContinueGame = () => {
    setStatus("");
    setRoom("");
    setGameType("WordBlitzLocal");
    setInRoom(false);
    setGameStarted(false);
    setGameOver(false);
    setIsCreator(false);
    setPlayers([]);
    setQuestions([]);
    setAnswers({});
    setPlayerNames([""]);
    setCurrentLocalPlayerIndex(0);
    setLocalTimeLeft(timeLimit);
  };

  // --------------------------------------------------------------------------
  // 9. Add Custom Questions
  // --------------------------------------------------------------------------
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
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error adding custom questions");
    }
  };

  // --------------------------------------------------------------------------
  // RENDERING
  // --------------------------------------------------------------------------
  // Show which local player is up:
  const currentLocalPlayerName =
    gameType === "WordBlitzLocal" &&
    currentLocalPlayerIndex < players.length
      ? players[currentLocalPlayerIndex].username
      : "";

  return (
    <Layout>
      <div className="word-blitz-container">
        <h1>🔥 WordBlitz</h1>

        {/* Not in a game => create local or online */}
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

            {/* Room input */}
            <input
              type="text"
              placeholder="Enter Room Name"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />

            {/* If local, gather all player names */}
            {gameType === "WordBlitzLocal" && (
              <div style={{ marginTop: "10px" }}>
                <p>Enter Player Names (local, same device):</p>
                {playerNames.map((pname, idx) => (
                  <input
                    key={idx}
                    type="text"
                    style={{ display: "block", margin: "5px 0" }}
                    value={pname}
                    onChange={(e) => {
                      const arr = [...playerNames];
                      arr[idx] = e.target.value;
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

            {/* Time limit */}
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

        {/* If user wants to join an existing online game */}
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
                    Room: <strong>{g.room}</strong> (Players: {g.players.length})
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

        {/* Add custom questions button */}
        {!inRoom && (
          <button
            className="add-questions-button"
            onClick={() => setIsModalOpen(true)}
            style={{ marginBottom: "10px" }}
          >
            ➕ Add Custom Questions
          </button>
        )}
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
                        const arr = [...customQuestions];
                        arr[index] = e.target.value;
                        setCustomQuestions(arr);
                      }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={submitCustomQuestions}>Submit Custom Questions</button>
              <button className="close-button" onClick={() => setIsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Online waiting room */}
        {inRoom && !gameStarted && gameType === "WordBlitzOnline" && (
          <div style={{ marginTop: "20px", color: "black" }}>
            <h2>Waiting Room: {room}</h2>
            <p>Players in this game:</p>
            <ul>
              {players.map((p, i) => (
                <li key={i}>{p.username}</li>
              ))}
            </ul>
            {isCreator && (
              <button onClick={startGame} style={{ marginTop: "10px" }}>
                Start Game
              </button>
            )}
          </div>
        )}

        {/* Game in progress */}
        {gameStarted && !gameOver && (
          <div style={{ marginTop: "20px", color: "black" }}>
            <h2>Room: {room}</h2>

            {gameType === "WordBlitzLocal" ? (
              <>
                <h3>
                  Current Player: {currentLocalPlayerName} | Time Left: {localTimeLeft}
                </h3>
              </>
            ) : (
              <p>Online mode (polling server for time left)...</p>
            )}

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

            <button className="submit-button" onClick={() => submitAllAnswers(false)}>
              Submit Answers
            </button>
          </div>
        )}

        {/* Game Over */}
        {gameOver && (
          <div style={{ marginTop: "20px", color: "black" }}>
            <h2>Final Scores:</h2>
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
