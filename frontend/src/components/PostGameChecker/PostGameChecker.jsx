import React, { useState, useEffect } from "react";
import "./PostGameChecker.css";

const PostGameChecker = ({ visible, onClose, gameId, isAdmin }) => {
  const [answersState, setAnswersState] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const CHECKER_API = "http://localhost:5000/answer_checker";

  // ----------------------------------------------------------
  // 1) Fetch fresh data each time popup opens or game changes
  // ----------------------------------------------------------
  useEffect(() => {
    if (!visible || !gameId) return;
    fetchAllAnswers();
  }, [visible, gameId]);

  // ----------------------------------------------------------
  // 2) Optionally poll for updates while visible
  // ----------------------------------------------------------
  useEffect(() => {
    let pollId;
    if (visible && gameId) {
      pollId = setInterval(() => {
        fetchAllAnswers();
      }, 3000); // poll every 3s
    }
    return () => {
      if (pollId) clearInterval(pollId);
    };
  }, [visible, gameId]);

  const fetchAllAnswers = async () => {
    setLoading(true);
    setError("");
    try {
      // Example endpoint; adjust if your backend uses "room" instead of "game_id"
      const resp = await fetch(`http://localhost:5000/word_blitz/all_answers?game_id=${gameId}`);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Error fetching all answers");
      }
      setAnswersState(data.answers || []);
    } catch (err) {
      setError("Failed to fetch answers: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------
  // 3) The existing checkAI, requestVote, override calls,
  //    but each triggers fetchAllAnswers() after success.
  // ----------------------------------------------------------

  const handleCheckAI = async (answerIdx) => {
    setLoading(true);
    setError("");

    const row = answersState[answerIdx];
    if (!row) {
      setError("Answer row not found");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`${CHECKER_API}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          question_id: row.questionId,
          username: row.username,
          answer_text: row.word
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Error checking answer");
      } else {
        // Optionally update local state here, but we can also just re-fetch
        await fetchAllAnswers();
      }
    } catch (err) {
      console.error(err);
      setError("Network/Server error: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVote = async (answerIdx) => {
    setLoading(true);
    setError("");

    const row = answersState[answerIdx];
    if (!row || !row.answerId) {
      setError("No answer_id to request vote. Check with AI first?");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`${CHECKER_API}/request_vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer_id: row.answerId }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Error requesting vote");
      } else {
        await fetchAllAnswers();
      }
    } catch (err) {
      setError("Network/Server error: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (answerIdx, overrideVal) => {
    setLoading(true);
    setError("");

    const row = answersState[answerIdx];
    if (!row || !row.answerId) {
      setError("No answer_id to override. Check with AI first?");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`${CHECKER_API}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer_id: row.answerId,
          override_value: overrideVal
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Error overriding");
      } else {
        await fetchAllAnswers();
        if (onScoresChanged){
          onScoresChanged();
        }
      }
    } catch (err) {
      setError("Network/Server error: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

  // For completeness, if you add handleCastVote for each user's yes/no vote:
  const handleCastVote = async (answerIdx, vote) => {
    // example usage if you have a /cast_vote endpoint
    // after success, do fetchAllAnswers()
  };

  // ----------------------------------------------------------
  // 4) Rendering
  // ----------------------------------------------------------
  if (!visible) return null;

  return (
    <div className="postgame-checker-overlay">
      <div className="postgame-checker-modal">
        <button className="close-button" onClick={onClose}>✖</button>
        <h2 className="checker-title">🎯 Post-Game Answer Checker 🎯</h2>
  
        {error && <p className="error-message">🚨 {error} 🚨</p>}
        {loading}
  
        <div className="checker-table">
          {answersState.map((ans, idx) => {
            let finalCorrect = ans.adminOverride ? ans.overrideValue : ans.aiCorrect;
  
            return (
              <div key={ans.id} className={`checker-row ${finalCorrect ? 'correct-answer' : 'incorrect-answer'}`}>
                <div className="player-info">
                  <span className="player-label">👤 Player:</span> <span className="player-name">{ans.username}</span>
                </div>
                <div className="question-info">
                  <span className="question-label">❓ Question:</span> "{ans.questionPrompt}"
                </div>
                <div className="answer-info">
                  <span className="answer-label">💡 Answer:</span> "{ans.word}"
                </div>
  
                {ans.aiResult && (
                  <div className="ai-feedback">
                    <div className="ai-judgement">
                      <span className="ai-label">🤖 AI says:</span>{" "}
                      <span className={ans.aiCorrect ? 'correct-text' : 'incorrect-text'}>
                        {ans.aiCorrect ? "✅ Correct!" : "❌ Incorrect"}
                      </span>
                    </div>
                    <div className="ai-explanation">"{ans.aiResult}"</div>
                  </div>
                )}
  
                {finalCorrect !== undefined && (
                  <div className="final-judgement">
                    <span className="final-label">🏆 Final Decision:</span>{" "}
                    <span className={finalCorrect ? 'correct-text' : 'incorrect-text'}>
                      {finalCorrect ? "✨ Correct! ✨" : "💥 Incorrect 💥"}
                    </span>
                  </div>
                )}
  
                <div className="action-buttons">
                  <button className="action-btn ai-check-btn" disabled={loading} onClick={() => handleCheckAI(idx)}>
                    🔍 Check with AI
                  </button>
  
                  {!ans.voteRequested && (
                    <button className="action-btn vote-btn" disabled={loading} onClick={() => handleRequestVote(idx)}>
                      ✋ Request Vote
                    </button>
                  )}
                  {ans.voteRequested && <span className="vote-pending"> (Vote requested 👀)</span>}
  
                  {isAdmin && (
                    <>
                      <button className="action-btn override-correct-btn" disabled={loading} onClick={() => handleOverride(idx, true)}>
                        👍 Override: Correct
                      </button>
                      <button className="action-btn override-incorrect-btn" disabled={loading} onClick={() => handleOverride(idx, false)}>
                        👎 Override: Incorrect
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
  
        <button className="close-checker-btn" onClick={onClose}>
          🚪 Close Checker
        </button>
      </div>
    </div>
  );
};

export default PostGameChecker;
