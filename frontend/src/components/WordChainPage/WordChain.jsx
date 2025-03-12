import React, { useState, useEffect, useRef } from "react";
import "./WordChain.css";
import Layout from "../Layout/Layout";

// Adjust these to your actual API setup:
const API_URL = "http://localhost:5000";
const API_BASE_URL = `${API_URL}/word_chain`;

const WordChain = () => {
  // Logged-in user (for online)
  const [loggedInUser, setLoggedInUser] = useState("");

  // Current user name used by the server
  // - In "online" mode, we auto-assign it from `loggedInUser`
  // - In "local" mode, we let the user type it in
  const [currentUser, setCurrentUser] = useState("");

  // Basic states
  const [room, setRoom] = useState("");
  const [players, setPlayers] = useState([]);
  const [wordChain, setWordChain] = useState([]);
  const [status, setStatus] = useState("");
  const [gameMode, setGameMode] = useState(""); // "local" or "online"
  const [localPlayers, setLocalPlayers] = useState([]);
  const [newLocalPlayer, setNewLocalPlayer] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // ========================
  //   Local Turn-based State
  // ========================
  const [inLocalGame, setInLocalGame] = useState(false);   // Are we playing turn-based locally?
  const [turnPlayers, setTurnPlayers] = useState([]);       // Which local players are still alive
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0); // Whose turn is it? Index in turnPlayers

  // Timer-related state (for local & online)
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null); // so we can clear it or handle timeouts in local mode

  // =========================================================================
  // 1. On mount, fetch the logged-in user from localStorage token
  // =========================================================================
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        return; // Not logged in => fine for local
      }
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setLoggedInUser(data.username); // e.g. {username: "Alice"}
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Whenever 'gameMode' changes
  useEffect(() => {
    if (gameMode === "online") {
      setCurrentUser(loggedInUser || "");
    } else {
      // local mode
      setCurrentUser("");
    }
  }, [gameMode, loggedInUser]);

  // =========================================================================
  // 2. Fetch Game State: GET /word_chain/get_state?room=...
  // =========================================================================
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

  // Whenever 'room' changes (or is set), fetch current state:
  useEffect(() => {
    if (room) {
      fetchGameState(room);
    }
  }, [room]);

  // Determine if current user is admin (server logic: first joined = admin).
  // We'll do a simple check: if the currentUser name matches players[0], we assume admin.
  useEffect(() => {
    if (players.length > 0 && currentUser) {
      setIsAdmin(players[0] === currentUser);
    } else {
      setIsAdmin(false);
    }
  }, [players, currentUser]);

  // =========================================================================
  // 3. CREATE GAME
  // =========================================================================
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
        // Clear players, chain, etc., and refetch
        setPlayers([]);
        setWordChain([]);
        fetchGameState(room);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  // =========================================================================
  // 4. JOIN GAME
  // =========================================================================
  const joinGame = async () => {
    if (!room) {
      setStatus("❌ Please enter a room name!");
      return;
    }

    if (gameMode === "online") {
      // In online mode, we rely on `loggedInUser`.
      if (!loggedInUser) {
        setStatus("❌ You must be logged in (token) to join an online game!");
        return;
      }
    } else {
      // local mode => use `currentUser` from input
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

  // =========================================================================
  // 5. SUBMIT WORD
  // =========================================================================
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
      // local, not turn-based => just currentUser
      if (!currentUser) {
        setStatus("❌ Please enter a username first!");
        return;
      }
      usernameToUse = currentUser;
    } else {
      // local + turn-based => the current turn's player
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
        // The server says invalid word => eliminate the player
        setStatus(`❌ ${data.error}. ${usernameToUse} is eliminated!`);
        eliminateLocalPlayer(usernameToUse);
      } else {
        setStatus(`✅ ${data.message}`);
        // Clear input
        wordInput.value = "";

        // If local & turn-based => next player's turn
        if (inLocalGame) {
          advanceToNextTurn();
        }
      }
      // Refresh the game state
      fetchGameState(room);
    } catch (err) {
      console.error(err);
      setStatus("❌ Server error");
    }
  };

  // =========================================================================
  // 6. LOCAL PLAYERS: Just a list typed by user, not actually used by server
  // =========================================================================
  const addLocalPlayer = () => {
    if (newLocalPlayer && !localPlayers.includes(newLocalPlayer)) {
      setLocalPlayers([...localPlayers, newLocalPlayer]);
      setNewLocalPlayer("");
    }
  };

  // =========================================================================
  // 7. TURN-BASED LOCAL GAME LOGIC
  // =========================================================================
  const startLocalGame = () => {
    if (players.length === 0) {
      setStatus("❌ No one joined the server game yet.");
      return;
    }
    setStatus("Local turn-based game started!");
    setInLocalGame(true);

    // Copy the joined players from the server
    setTurnPlayers([...players]);
    setCurrentTurnIndex(0);

    // Start a fresh 30s turn
    startLocalTurnTimer(30);
  };

  const startLocalTurnTimer = (duration) => {
    // Clear existing timer
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
    // Current player failed to submit => they're eliminated
    const eliminatedPlayer = turnPlayers[currentTurnIndex];
    setStatus(`❌ Time ran out for ${eliminatedPlayer}! Eliminated.`);

    eliminateLocalPlayer(eliminatedPlayer);
  };

  const eliminateLocalPlayer = (playerName) => {
    // Remove from turnPlayers
    const updated = turnPlayers.filter((p) => p !== playerName);

    if (updated.length <= 1) {
      // Game ends
      endLocalGame(updated);
      return;
    }

    setTurnPlayers(updated);

    // If the eliminated player had an index <= currentTurnIndex,
    // we might need to adjust the currentTurnIndex so we don't skip the next player
    let newIndex = currentTurnIndex;
    if (currentTurnIndex >= updated.length) {
      newIndex = 0; // wrap around
    }
    setCurrentTurnIndex(newIndex);

    // Start next turn
    startLocalTurnTimer(30);
  };

  const advanceToNextTurn = () => {
    let nextIndex = currentTurnIndex + 1;
    if (nextIndex >= turnPlayers.length) {
      nextIndex = 0;
    }
    setCurrentTurnIndex(nextIndex);
    startLocalTurnTimer(30);
  };

  const endLocalGame = (remaining) => {
    // Stop local timer
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

  // =========================================================================
  // 8. START TIMER for Online
  // =========================================================================
  const handleStartTimer = async () => {
    // If local turn-based => we ignore "server timer"
    if (gameMode === "local") {
      setStatus("You are in local turn-based mode. Use 'Start Local Game'.");
      return;
    }

    // Online
    if (!room) {
      setStatus("❌ No room specified!");
      return;
    }
    if (!isAdmin) {
      setStatus("❌ Only the admin can start the timer!");
      return;
    }

    const duration = 30; // or let the user pick
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
        // We'll do a simple local countdown (not turn-based) for online
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

  // =========================================================================
  // 9. KICK PLAYER
  // =========================================================================
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

  // =========================================================================
  // 10. VETO WORD
  // =========================================================================
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

  // Current player in local turn-based
  const currentLocalPlayer = inLocalGame && turnPlayers.length > 0
    ? turnPlayers[currentTurnIndex]
    : null;

  // =========================================================================
  // UI RENDER
  // =========================================================================
  return (
    <Layout>
      <div className="word-chain-container">
        <h1>🔗 Word Chain Game</h1>

        {/* Mode selection */}
        <div className="mode-selection">
          <button onClick={() => setGameMode("online")}>Play Online</button>
          <button onClick={() => setGameMode("local")}>Local Multiplayer</button>
        </div>

        {gameMode && (
          <div className="game-setup">
            <input
              type="text"
              placeholder="Enter Room Name"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />

            {/* If local, let user type a username. If online, use loggedInUser. */}
            {gameMode === "local" && (
              <input
                type="text"
                placeholder="Your Username"
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
              />
            )}
            {gameMode === "online" && (
              <p style={{ margin: "5px 0" }}>
                <strong>Online username:</strong>{" "}
                {loggedInUser || "Not logged in!"}
              </p>
            )}

            {gameMode === "local" && (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="Enter Another Local Player"
                  value={newLocalPlayer}
                  onChange={(e) => setNewLocalPlayer(e.target.value)}
                />
                <button onClick={addLocalPlayer}>Add Local Player</button>
                <ul>
                  {localPlayers.map((p, index) => (
                    <li key={index}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="setup-buttons">
              <button onClick={createGame}>Create Game</button>
              <button onClick={joinGame}>Join Game</button>
            </div>

            {/* Start local turn-based game button */}
            {gameMode === "local" && !inLocalGame && (
              <button
                style={{ marginTop: "10px" }}
                onClick={startLocalGame}
              >
                Start Local Game
              </button>
            )}
          </div>
        )}

        {/* Players list */}
        <h2>👥 Players in Room:</h2>
        <ul>
          {players.map((p, index) => (
            <li key={index}>
              {p}
              {isAdmin && p !== currentUser && p !== loggedInUser && (
                <button
                  style={{ marginLeft: "8px" }}
                  onClick={() => kickPlayer(p)}
                >
                  Kick
                </button>
              )}
            </li>
          ))}
        </ul>
        {isAdmin && <p>You are the admin.</p>}

        {/* If local turn-based game is active, show whose turn & countdown */}
        {inLocalGame && turnPlayers.length > 0 && (
          <div style={{ margin: "10px 0" }}>
            <h3>Local Turn-Based Game</h3>
            <p>
              Current Turn: {currentLocalPlayer} 
              {"  "}({timeLeft}s left)
            </p>
            <p>Active Players: {turnPlayers.join(", ")}</p>
          </div>
        )}

        {/* Timer controls for online mode only */}
        {gameMode === "online" && (
          <div className="timer-section">
            <h3>⏱ Timer: {timeLeft}s</h3>
            {isAdmin && (
              <>
                <button onClick={handleStartTimer}>Start Timer</button>
                <button onClick={stopTimer}>Stop Timer</button>
              </>
            )}
          </div>
        )}

        {/* Word chain UI */}
        <h2>🔗 Word Chain:</h2>
        {wordChain.length > 0 ? (
          <ul>
            {wordChain.map((w, index) => (
              <li key={index}>
                {w}
                {isAdmin && (
                  <button
                    style={{ marginLeft: "8px" }}
                    onClick={() => vetoWord(w)}
                  >
                    Veto
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No words yet. Submit one below!</p>
        )}

        {/* Submit a new word */}
        <div className="submit-word">
          <input type="text" placeholder="Enter a word" id="wordInput" />
          <button onClick={submitWord}>Submit</button>
        </div>

        <p className="status-message">{status}</p>
      </div>
    </Layout>
  );
};

export default WordChain;
