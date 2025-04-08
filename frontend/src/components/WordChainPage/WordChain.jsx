import React, { useState, useEffect, useRef } from "react";
import "./WordChain.css";
import Layout from "../Layout/Layout";

const API_URL = "http://localhost:5000";
const API_BASE_URL = `${API_URL}/word_chain`;

const WordChain = () => {
  const [loggedInUser, setLoggedInUser] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [room, setRoom] = useState("");
  const [players, setPlayers] = useState([]);
  const [wordChain, setWordChain] = useState([]);
  const [status, setStatus] = useState("");
  const [gameMode, setGameMode] = useState("");
  const [localPlayers, setLocalPlayers] = useState([]);
  const [newLocalPlayer, setNewLocalPlayer] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Local game state
  const [inLocalGame, setInLocalGame] = useState(false);
  const [turnPlayers, setTurnPlayers] = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);

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

  useEffect(() => {
    if (gameMode === "online") {
      setCurrentUser(loggedInUser || "");
    } else {
      setCurrentUser("");
    }
  }, [gameMode, loggedInUser]);

  const fetchGameState = async (targetRoom) => {
    try {
      const res = await fetch(`${API_BASE_URL}/get_state?room=${targetRoom}`);
      const data = await res.json();
      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else {
        setPlayers(data.players || []);
        setWordChain(data.wordChain || []);
        setStatus("State refreshed!");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to fetch game state");
    }
  };

  useEffect(() => {
    if (room) {
      fetchGameState(room);
    }
  }, [room]);

  useEffect(() => {
    if (players.length > 0 && currentUser) {
      setIsAdmin(players[0] === currentUser);
    } else {
      setIsAdmin(false);
    }
  }, [players, currentUser]);

  const createGame = async () => {
    if (!room) {
      setStatus("❌ Please enter a room name!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
      });
      const data = await response.json();
      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else {
        setStatus(`✅ ${data.message}`);
        setPlayers([]);
        setWordChain([]);
        fetchGameState(room);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  const joinGame = async () => {
    if (!room) {
      setStatus("❌ Please enter a room name!");
      return;
    }

    if (gameMode === "online") {
      if (!loggedInUser) {
        setStatus("❌ You must be logged in (token) to join an online game!");
        return;
      }
    } else {
      if (!currentUser) {
        setStatus("❌ Please enter a username!");
        return;
      }
    }

    const usernameToUse = gameMode === "online" ? loggedInUser : currentUser;

    try {
      const response = await fetch(`${API_BASE_URL}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, username: usernameToUse }),
      });
      const data = await response.json();
      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else {
        setStatus(`✅ ${data.message}`);
        fetchGameState(room);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  const submitWord = async () => {
    const wordInput = document.getElementById("wordInput");
    const word = (wordInput.value || "").trim();
    if (!word) {
      setStatus("❌ Please enter a word!");
      return;
    }

    let usernameToUse = "";
    if (gameMode === "online") {
      if (!loggedInUser) {
        setStatus("❌ You must be logged in for online mode!");
        return;
      }
      usernameToUse = loggedInUser;
    } else if (!inLocalGame) {
      if (!currentUser) {
        setStatus("❌ Please enter a username first!");
        return;
      }
      usernameToUse = currentUser;
    } else {
      if (!turnPlayers.length) {
        setStatus("❌ No local players in the game!");
        return;
      }
      usernameToUse = turnPlayers[currentTurnIndex];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/submit_word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, word, username: usernameToUse }),
      });
      const data = await response.json();
      if (data.error) {
        setStatus(`❌ ${data.error}. ${usernameToUse} is eliminated!`);
        eliminateLocalPlayer(usernameToUse);
      } else {
        setStatus(`✅ ${data.message}`);
        wordInput.value = "";
        
        // Only advance turn if in local game and word was successfully submitted
        if (inLocalGame && !data.error) {
          advanceToNextTurn();
        }
      }
      fetchGameState(room);
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  const addLocalPlayer = () => {
    if (newLocalPlayer && !localPlayers.includes(newLocalPlayer)) {
      setLocalPlayers([...localPlayers, newLocalPlayer]);
      setNewLocalPlayer("");
    }
  };

  const startLocalGame = () => {
    if (players.length === 0) {
      setStatus("❌ No one joined the server game yet.");
      return;
    }
    setStatus("Local turn-based game started!");
    setInLocalGame(true);
    setTurnPlayers([...players]);
    setCurrentTurnIndex(0);
    startLocalTurnTimer(30);
  };

  const startLocalTurnTimer = (duration) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setTimeLeft(duration);
    const newTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(newTimer);
          handleLocalTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = newTimer;
  };

  const handleLocalTimeOut = () => {
    const eliminatedPlayer = turnPlayers[currentTurnIndex];
    setStatus(`❌ Time ran out for ${eliminatedPlayer}! Eliminated.`);
    eliminateLocalPlayer(eliminatedPlayer);
  };

  const eliminateLocalPlayer = (playerName) => {
    const updated = turnPlayers.filter((p) => p !== playerName);

    if (updated.length <= 1) {
      endLocalGame(updated);
      return;
    }

    setTurnPlayers(updated);
    
    // Adjust turn index if needed
    let newIndex = currentTurnIndex;
    if (currentTurnIndex >= updated.length) {
      newIndex = 0;
    }
    setCurrentTurnIndex(newIndex);
    startLocalTurnTimer(30);
  };

  const advanceToNextTurn = () => {
    let nextIndex = (currentTurnIndex + 1) % turnPlayers.length;
    setCurrentTurnIndex(nextIndex);
    startLocalTurnTimer(30);
  };

  const endLocalGame = (remaining) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setInLocalGame(false);

    if (remaining.length === 1) {
      setStatus(`🎉 ${remaining[0]} is the winner!`);
    } else {
      setStatus("Everyone got eliminated! No winner.");
    }
    setTurnPlayers([]);
    setCurrentTurnIndex(0);
  };

  const handleStartTimer = async () => {
    if (gameMode === "local") {
      setStatus("You are in local turn-based mode. Use 'Start Local Game'.");
      return;
    }

    if (!room) {
      setStatus("❌ No room specified!");
      return;
    }
    if (!isAdmin) {
      setStatus("❌ Only the admin can start the timer!");
      return;
    }

    const duration = 30;
    try {
      const response = await fetch(`${API_BASE_URL}/start_timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          admin_username: loggedInUser,
          duration,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else {
        setStatus(`✅ ${data.message}`);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(duration);

        const newTimer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(newTimer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        timerRef.current = newTimer;
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    timerRef.current = null;
  };

  const kickPlayer = async (playerToKick) => {
    if (!isAdmin) {
      setStatus("❌ Only admin can kick players!");
      return;
    }
    if (!room) {
      setStatus("❌ No room specified!");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/kick_player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          admin_username: gameMode === "online" ? loggedInUser : currentUser,
          username: playerToKick,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else {
        setStatus(`✅ ${data.message}`);
        fetchGameState(room);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  const vetoWord = async (wordToVeto) => {
    if (!isAdmin) {
      setStatus("❌ Only admin can veto words!");
      return;
    }
    if (!room) {
      setStatus("❌ No room specified!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/veto_word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          admin_username: gameMode === "online" ? loggedInUser : currentUser,
          word: wordToVeto,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else {
        setStatus(`✅ ${data.message}`);
        fetchGameState(room);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  const currentLocalPlayer = inLocalGame && turnPlayers.length > 0
    ? turnPlayers[currentTurnIndex]
    : null;

  return (
    <Layout>
      <div className="word-blitz-container">
      <h1
          style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              marginBottom: '20px',
              textAlign: 'center',
              padding: '10px',
              maxWidth: '100%',
              wordBreak: 'break-word',
              background: 'linear-gradient(to right, #4a90e2,rgb(57, 25, 198))',  
              display: 'inline-block',
              borderRadius: '8px',
              color: 'white',
              
          }}
          >
              🌈✨ Word Chain ✨🌈
      </h1>
  
        <div className="game-setup-container">
          <h2 className="setup-title">🎮 Choose Game Mode</h2>
          <div className="game-type-selector">
            <label className="game-type-option">
              <input
                type="radio"
                name="gameMode"
                checked={gameMode === "online"}
                onChange={() => setGameMode("online")}
              />
              <span className="game-type-label">🌍 Online Play</span>
            </label>
            <label className="game-type-option">
              <input
                type="radio"
                name="gameMode"
                checked={gameMode === "local"}
                onChange={() => setGameMode("local")}
              />
              <span className="game-type-label">🎲 Local Multiplayer</span>
            </label>
          </div>
  
          {gameMode && (
            <div className="game-setup">
              <div className="room-input-container">
                <input
                  type="text"
                  placeholder="🏠 Enter Room Name"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="room-name-input"
                />
              </div>
  
              {gameMode === "local" && (
                <div className="player-name-input-container">
                  <input
                    type="text"
                    placeholder="👤 Your Username"
                    value={currentUser}
                    onChange={(e) => setCurrentUser(e.target.value)}
                    className="player-name-input"
                  />
                </div>
              )}
              {gameMode === "online" && (
                <p className="online-username-display">
                  <span className="online-username-label">🌐 Online username:</span>{" "}
                  <span className="online-username-value">
                    {loggedInUser || "Not logged in!"}
                  </span>
                </p>
              )}
  
              {gameMode === "local" && (
                <div className="local-players-section">
                  <p className="players-title">👥 Add Local Players:</p>
                  <div className="add-player-container">
                    <input
                      type="text"
                      placeholder="👤 Player Name"
                      value={newLocalPlayer}
                      onChange={(e) => setNewLocalPlayer(e.target.value)}
                      className="player-name-input"
                    />
                    <button onClick={addLocalPlayer} className="add-player-btn">
                      ➕ Add Player
                    </button>
                  </div>
                  <ul className="players-list">
                    {localPlayers.map((p, index) => (
                      <li key={index} className="player-item">
                        👤 {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
  
              <div className="setup-buttons">
                <button onClick={createGame} className="create-game-btn">
                  🚀 Create Game
                </button>
                <button onClick={joinGame} className="join-game-btn">
                  🔗 Join Game
                </button>
              </div>
  
              {gameMode === "local" && !inLocalGame && (
                <button onClick={startLocalGame} className="start-game-btn">
                  🏁 Start Local Game
                </button>
              )}
            </div>
          )}
        </div>
  
        {players.length > 0 && (
          <div className="waiting-room-container">
            <h2 className="waiting-title">👥 Players in Room</h2>
            <ul className="players-list">
              {players.map((p, index) => (
                <li key={index} className="player-item">
                  👤 {p}
                  {isAdmin && p !== currentUser && p !== loggedInUser && (
                    <button
                      onClick={() => kickPlayer(p)}
                      className="kick-player-btn"
                    >
                      🚫 Kick
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {isAdmin && <p className="admin-label">⭐ You are the admin</p>}
          </div>
        )}
  
        {inLocalGame && turnPlayers.length > 0 && (
          <div className="game-play-container">
            <h3 className="current-player-info">
              🎮 <span className="current-player">{currentLocalPlayer}</span>'s turn! 
              ⏱️ <span className="time-left">{timeLeft}</span> seconds left
            </h3>
            <p className="active-players">Active Players: {turnPlayers.join(", ")}</p>
          </div>
        )}
  
        {gameMode === "online" && (
          <div className="game-play-container">
            <h3 className="timer-display">⏱ Timer: {timeLeft}s</h3>
            {isAdmin && (
              <div className="timer-controls">
                <button onClick={handleStartTimer} className="timer-btn">
                  ▶ Start Timer
                </button>
                <button onClick={stopTimer} className="timer-btn">
                  ⏹ Stop Timer
                </button>
              </div>
            )}
          </div>
        )}
  
        <div className="game-play-container">
          <h2 className="word-chain-title">🔗 Word Chain</h2>
          {wordChain.length > 0 ? (
            <ul className="word-chain-list">
              {wordChain.map((w, index) => (
                <li key={index} className="word-chain-item">
                  {w}
                  {isAdmin && (
                    <button
                      onClick={() => vetoWord(w)}
                      className="veto-btn"
                    >
                      ❌ Veto
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-words-message">No words yet. Be the first to submit one!</p>
          )}
  
          <div className="submit-word-container">
            <input 
              type="text" 
              placeholder="✨ Enter a word" 
              className="word-input" 
              id="wordInput" 
            />
            <button onClick={submitWord} className="submit-word-btn">
              🚀 Submit
            </button>
          </div>
        </div>
  
        <p className={`status-message ${status.includes('Error') ? 'error' : ''}`}>
          {status}
        </p>
      </div>
    </Layout>
  );
};

export default WordChain;