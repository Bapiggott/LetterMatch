import React, { useState, useEffect } from "react";
import "./WordBlitz.css";
import Layout from "../Layout/Layout";

// Import the PostGameChecker component
import PostGameChecker from "../PostGameChecker/PostGameChecker";

const API_URL = "http://localhost:5000";
const API_BASE_URL = `${API_URL}/word_blitz`;

const WordBlitz = () => {
  // Logged-in user (for online)
  const [loggedInUser, setLoggedInUser] = useState("");

  // ID of the currently active game
  const [gameId, setGameId] = useState(null);

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

  //---------------------------------------------------------------------------
  // 1. On mount, fetch logged-in user (for online)
  //---------------------------------------------------------------------------
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return; 
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

  //---------------------------------------------------------------------------
  // 2. "Local" Turn Timer: each local player gets "timeLimit" seconds
  //---------------------------------------------------------------------------
  useEffect(() => {
    if (gameType !== "WordBlitzLocal") return;
    if (!gameStarted || gameOver) return;

    const intervalId = setInterval(() => {
      setLocalTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          // Auto-submit for this player
          submitAllAnswers(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameType, gameStarted, gameOver, currentLocalPlayerIndex]);

  //---------------------------------------------------------------------------
  // 3. For ONLINE: poll server for "time_left" etc.
  //---------------------------------------------------------------------------
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

  //---------------------------------------------------------------------------
  // fetchGameState (ONLINE only) – local is handled in front end
  //---------------------------------------------------------------------------
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
      setPlayers(data.players || []);

      if (data.started && data.questions) {
        setQuestions(data.questions);
        const initAns = {};
        data.questions.forEach((q) => {
          initAns[q.question_id] = "";
        });
        setAnswers((old) => ({ ...initAns, ...old }));
      }

      if (data.started && data.time_left === 0) {
        // Time ended => game over
        setGameOver(true);
        setStatus("⏰ Time's up! Final scores shown below.");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to fetch state");
    }
  };

  //---------------------------------------------------------------------------
  // 4. CREATE GAME
  //---------------------------------------------------------------------------
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

        // If the backend returns a game_id:
        if (data.game_id) {
          setGameId(data.game_id);
        }

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
        // fetch the actual players from the server
        const gameStateResp = await fetch(`${API_BASE_URL}/get_state?room=${room}`);
        const gameStateData = await gameStateResp.json();
        if (!gameStateData.error) {
          setPlayers(gameStateData.players || []);
        }

        setCurrentLocalPlayerIndex(0);
        setLocalTimeLeft(timeLimit);

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

  //---------------------------------------------------------------------------
  // 5. JOIN an Existing Online Game
  //---------------------------------------------------------------------------
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

        // if we had a game_id from openGames, store it
        const found = openGames.find((g) => g.room === selectedRoom);
        if (found) {
          setGameId(found.game_id);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error while joining");
    }
  };

  //---------------------------------------------------------------------------
  // 6. START (Online Only)
  //---------------------------------------------------------------------------
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
        fetchGameState();
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error while starting");
    }
  };

  //---------------------------------------------------------------------------
  // 7. SUBMIT answers
  //---------------------------------------------------------------------------
  const submitAllAnswers = async (autoFromTimer = false) => {
    if (!questions.length) {
      return setStatus("❌ No questions to answer.");
    }

    // For local, find the player's name from currentLocalPlayerIndex
    let localPlayerName = "";
    if (gameType === "WordBlitzLocal") {
      const p = players[currentLocalPlayerIndex];
      if (!p) {
        console.warn("No player found at index", currentLocalPlayerIndex);
        return;
      }
      localPlayerName = p.username;
    }

    // If not autoFromTimer, ensure each question has an answer
    if (!autoFromTimer && gameType === "WordBlitzLocal") {
      for (const q of questions) {
        if (!answers[q.question_id] || !answers[q.question_id].trim()) {
          setStatus(`❌ Please fill all answers before submitting!`);
          return;
        }
      }
    }

    // Debug log to ensure we see all Q/A pairs
    console.log("Submitting answers:", answers);

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
        if (gameType === "WordBlitzLocal") {
          await reloadPlayersScores();
          advanceLocalTurn();
        } else {
          fetchGameState();
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error submitting answers");
    }
  };

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

  const advanceLocalTurn = () => {
    const nextIndex = currentLocalPlayerIndex + 1;
    if (nextIndex >= players.length) {
      setGameOver(true);
      setStatus("All local players finished! Final scores below.");
      reloadPlayersScores();
    } else {
      setCurrentLocalPlayerIndex(nextIndex);
      setLocalTimeLeft(timeLimit);

      const blankAnswers = {};
      questions.forEach((q) => {
        blankAnswers[q.question_id] = "";
      });
      setAnswers(blankAnswers);
      setStatus(`Now it's ${players[nextIndex].username}'s turn!`);
    }
  };

  //---------------------------------------------------------------------------
  // 8. GAME OVER => "Play Again?"
  //---------------------------------------------------------------------------
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
    setGameId(null);
  };

  //---------------------------------------------------------------------------
  // 9. Add Custom Questions
  //---------------------------------------------------------------------------
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

  //---------------------------------------------------------------------------
  // 10. POST-GAME CHECKER (Check All Answers)
  //---------------------------------------------------------------------------
  const [checkerVisible, setCheckerVisible] = useState(false);
  const [finalAnswers, setFinalAnswers] = useState([]);

  // Suppose we have an isAdmin check
  const isAdmin = false; // or real admin check

  // Fetch all answers once the game is over
  const handleShowChecker = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/all_answers?game_id=${gameId}`);// room=${room}
      const data = await resp.json();
      console.log("all_answers response:", data);
      if (data.error) {
        setStatus("❌ " + data.error);
      } else if (data.answers) {
        setStatus("✅ All answers fetched!");
        setFinalAnswers(data.answers);
        setCheckerVisible(true);
        setStatus("");
      }
    } catch (err) {
      console.error("Error fetching all answers:", err);
      setStatus("❌ Server error fetching all answers");
    }
  };

  const handleCloseChecker = () => {
    setCheckerVisible(false);
  };

  const handleScoresChanged = () => {
    // Re-fetch the game state, which includes updated players[] scores
    if (gameType === "WordBlitzOnline") {
      fetchGameState();
    } else {
      reloadPlayersScores();
    }
  };

  // Show which local player is up:
  const currentLocalPlayerName =
    gameType === "WordBlitzLocal" && currentLocalPlayerIndex < players.length
      ? players[currentLocalPlayerIndex].username
      : "";

  //---------------------------------------------------------------------------
  // RENDERING
  //---------------------------------------------------------------------------
  return (
    <Layout>
      <div className="word-blitz-container">
        <h1 className="game-title">🌈✨ Word Blitz ✨🌈</h1>
  
        {/* Not in a game => create local or online */}
        {!inRoom && (
          <div className="game-setup-container">
            <h2 className="setup-title">🎮 Create a Game</h2>
            <div className="game-type-selector">
              <label className="game-type-option">
                <input
                  type="radio"
                  value="WordBlitzLocal"
                  checked={gameType === "WordBlitzLocal"}
                  onChange={() => setGameType("WordBlitzLocal")}
                />
                <span className="game-type-label">🎲 Local Game</span>
              </label>
              <label className="game-type-option">
                <input
                  type="radio"
                  value="WordBlitzOnline"
                  checked={gameType === "WordBlitzOnline"}
                  onChange={() => setGameType("WordBlitzOnline")}
                />
                <span className="game-type-label">🌍 Online Game</span>
              </label>
            </div>
  
            <div className="room-input-container">
              <input
                type="text"
                placeholder="🏠 Enter Room Name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="room-name-input"
              />
            </div>
  
            {/* If local, gather all player names */}
            {gameType === "WordBlitzLocal" && (
              <div className="local-players-section">
                <p className="players-title">👥 Player Names:</p>
                {playerNames.map((pname, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Player ${idx + 1} name`}
                    value={pname}
                    onChange={(e) => {
                      const arr = [...playerNames];
                      arr[idx] = e.target.value;
                      setPlayerNames(arr);
                    }}
                    className="player-name-input"
                  />
                ))}
                <button
                  onClick={() => setPlayerNames([...playerNames, ""])}
                  className="add-player-btn"
                >
                  ➕ Add Player
                </button>
              </div>
            )}
  
            <div className="time-limit-container">
              <label className="time-limit-label">
                ⏱️ Time Limit (seconds):
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className="time-limit-input"
                />
              </label>
            </div>
  
            <button onClick={createGame} className="create-game-btn">
              🚀 Create Game
            </button>
          </div>
        )}
  
        {/* If user wants to join an existing online game */}
        {!inRoom && gameType === "WordBlitzOnline" && (
          <div className="join-game-container">
            <h2 className="join-title">🔍 Join an Existing Game</h2>
            <button onClick={fetchOpenGames} className="refresh-games-btn">
              🔄 Refresh Open Games
            </button>
            {openGames.length === 0 ? (
              <p className="no-games-message">😢 No open games found.</p>
            ) : (
              <ul className="games-list">
                {openGames.map((g) => (
                  <li key={g.game_id} className="game-item">
                    <div className="game-info">
                      <span className="game-room">🏠 {g.room}</span>
                      <span className="game-players">👥 {g.players.length} players</span>
                    </div>
                    <button
                      onClick={() => joinExistingGame(g.room)}
                      className="join-game-btn"
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
          >
            🧩 Add Custom Questions
          </button>
        )}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="modal-title">✨ Create New Question Set ✨</h2>
              <input
                type="text"
                placeholder="📝 Set Name"
                value={customSetName}
                onChange={(e) => setCustomSetName(e.target.value)}
                className="set-name-input"
              />
              <div className="question-list">
                {customQuestions.map((q, index) => (
                  <div key={index} className="question-box">
                    <input
                      type="text"
                      placeholder={`❓ Question ${index + 1}`}
                      value={q}
                      onChange={(e) => {
                        const arr = [...customQuestions];
                        arr[index] = e.target.value;
                        setCustomQuestions(arr);
                      }}
                      className="custom-question-input"
                    />
                  </div>
                ))}
              </div>
              <button onClick={submitCustomQuestions} className="submit-questions-btn">
                🎉 Submit Questions
              </button>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
                ✖ Close
              </button>
            </div>
          </div>
        )}
  
        {/* Online waiting room */}
        {inRoom && !gameStarted && gameType === "WordBlitzOnline" && (
          <div className="waiting-room-container">
            <h2 className="waiting-title">🕒 Waiting Room: {room}</h2>
            <p className="players-waiting">Players ready to play:</p>
            <ul className="players-list">
              {players.map((p, i) => (
                <li key={i} className="player-item">
                  👤 {p.username}
                </li>
              ))}
            </ul>
            {isCreator && (
              <button onClick={startGame} className="start-game-btn">
                🏁 Start Game!
              </button>
            )}
          </div>
        )}
  
        {/* Game in progress */}
        {gameStarted && !gameOver && (
          <div className="game-play-container">
            <h2 className="game-room-title">🏠 Room: {room}</h2>
  
            {gameType === "WordBlitzLocal" ? (
              <h3 className="current-player-info">
                🎮 <span className="current-player">{currentLocalPlayerName}</span>'s turn! 
                ⏱️ <span className="time-left">{localTimeLeft}</span> seconds left
              </h3>
            ) : (
              <p className="online-mode-message">🌍 Online mode - waiting for updates...</p>
            )}
  
            <h4 className="players-score-title">📊 Players & Scores:</h4>
            <ul className="scoreboard">
              {players.map((p, i) => (
                <li key={i} className="scoreboard-item">
                  <span className="scoreboard-player">👤 {p.username}</span>
                  <span className="scoreboard-score">🏆 {p.score} points</span>
                </li>
              ))}
            </ul>
  
            <div className="question-list">
              {questions.map((q) => (
                <div key={q.question_id} className="question-box">
                  <p className="question-prompt">
                    ❓ {q.prompt} <span className="starting-letter">(Starts with {q.letter.toUpperCase()})</span>
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
                    placeholder="Type your answer..."
                  />
                </div>
              ))}
            </div>
  
            <button className="submit-button" onClick={() => submitAllAnswers(false)}>
              🚀 Submit All Answers
            </button>
          </div>
        )}
  
        {/* Game Over */}
        {gameOver && (
          <div className="game-over-container">
            <h2 className="final-scores-title">🏆 Final Scores 🏆</h2>
            <ul className="final-scores">
              {players.map((p, i) => (
                <li key={i} className={`final-score-item ${i === 0 ? 'winner' : ''}`}>
                  <span className="final-player">👤 {p.username}</span>
                  <span className="final-score">🎯 {p.score} points</span>
                </li>
              ))}
            </ul>
            <div className="game-over-actions">
              {isCreator && (
                <button onClick={handleContinueGame} className="play-again-btn">
                  🔄 Play Again?
                </button>
              )}
              <button onClick={handleShowChecker} className="check-answers-btn">
                🔍 Check All Answers
              </button>
            </div>
          </div>
        )}
  
        <p className={`status-message ${status.includes('Error') ? 'error' : ''}`}>
          {status}
        </p>
  
        <PostGameChecker
          visible={checkerVisible}
          onClose={handleCloseChecker}
          gameId={gameId || 0}
          isAdmin={isAdmin}
          onScoresChanged={handleScoresChanged}
        />
      </div>
    </Layout>
  );
};

export default WordBlitz;
