import React, { useState, useEffect } from "react";
import "./PostGameChecker.css";

const PostGameChecker = ({ visible, onClose, gameId, isAdmin, onScoresChanged }) => {
  const [answersState, setAnswersState] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userVotes, setUserVotes] = useState({});
  const [loggedInUser, setLoggedInUser] = useState("");

  const CHECKER_API = "http://localhost:5000/answer_checker";
  const API_URL = "http://localhost:5000";

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
    if (!visible || !gameId) return;
    fetchAllAnswers();
  }, [visible, gameId]);

  const fetchAllAnswers = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_URL}/word_blitz/all_answers?game_id=${gameId}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Error fetching all answers");
      
      setAnswersState(data.answers || []);
      
      // Initialize user votes
      const votes = {};
      data.answers.forEach(ans => {
        if (ans.answerId && loggedInUser) {
          const userVote = ans.votes?.find(v => v.username === loggedInUser);
          if (userVote) {
            votes[ans.answerId] = userVote.vote_value;
          }
        }
      });
      setUserVotes(votes);
    } catch (err) {
      setError("Failed to fetch answers: " + err.toString());
    } finally {
      setLoading(false);
    }
  };

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
      if (!resp.ok) setError(data.error || "Error checking answer");
      await fetchAllAnswers();
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

    if (!loggedInUser) {
      setError("You must be logged in to request a vote");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`${CHECKER_API}/request_vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          answer_id: row.answerId,
          username: loggedInUser
        }),
      });
      
      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Error requesting vote");
      }
      
      await fetchAllAnswers();
    } catch (err) {
      console.error("Vote request error:", err);
      setError(err.message || "Failed to request vote");
    } finally {
      setLoading(false);
    }
  };

  const handleCastVote = async (answerIdx, vote) => {
    setLoading(true);
    setError("");
    const row = answersState[answerIdx];
    if (!row || !row.answerId) {
      setError("No answer_id to vote on");
      setLoading(false);
      return;
    }

    if (!loggedInUser) {
      setError("You must be logged in to vote");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`${CHECKER_API}/cast_vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          answer_id: row.answerId,
          vote: vote ? "yes" : "no",
          username: loggedInUser
        }),
      });
      
      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Error casting vote");
      }
      
      setUserVotes(prev => ({
        ...prev,
        [row.answerId]: vote ? "yes" : "no"
      }));
      
      await fetchAllAnswers();
      if (onScoresChanged) onScoresChanged();
    } catch (err) {
      console.error("Vote error:", err);
      setError(err.message || "Failed to cast vote");
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

    if (!loggedInUser) {
      setError("You must be logged in to override");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(`${CHECKER_API}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer_id: row.answerId,
          override_value: overrideVal,
          username: loggedInUser
        }),
      });
      
      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Error overriding");
      }
      
      await fetchAllAnswers();
      if (onScoresChanged) onScoresChanged();
    } catch (err) {
      console.error("Override error:", err);
      setError(err.message || "Failed to override");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="postgame-checker-overlay">
      <div className="postgame-checker-modal">
        <button className="close-button" onClick={onClose}>✖</button>
        <h2 className="checker-title">🎯 Post-Game Answer Checker 🎯</h2>
  
        {error && <p className="error-message">🚨 {error} 🚨</p>}
        {loading && <p className="loading-message">Loading...</p>}

        {/*<div className="debug-info">
          <p>Logged in as {loggedInUser || 'Guest'} | Answers: {answersState.length}</p>
        </div>*/}
  
        <div className="checker-table">
          {answersState.map((ans, idx) => {
            const finalCorrect = ans.adminOverride ? ans.overrideValue : ans.aiCorrect;
            const userVote = userVotes[ans.answerId];
            const showVoteButtons = ans.voteRequested && !ans.adminOverride && loggedInUser;
            const isAnswerOwner = ans.username === loggedInUser;
            const canRequestVote = isAnswerOwner && !ans.voteRequested && loggedInUser;
            const hasAnswerId = !!ans.answerId;

            return (
              <div key={ans.id} className={`checker-row ${finalCorrect ? 'correct-answer' : 'incorrect-answer'}`}>
                <div className="answer-header">
                  <div className="player-info">
                    <span className="player-label">👤 Player:</span> 
                    <span className="player-name">{ans.username}</span>
                    {isAnswerOwner && <span className="owner-badge">(You)</span>}
                  </div>
                  <div className="question-info">
                    <span className="question-label">❓ Question:</span> 
                    <span className="question-text">"{ans.questionPrompt}"</span>
                  </div>
                  <div className="answer-info">
                    <span className="answer-label">💡 Answer:</span> 
                    <span className="answer-text">"{ans.word}"</span>
                  </div>
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

                <div className="vote-section">
                  {ans.voteRequested ? (
                    <div className="vote-status">
                      <span className="vote-label">🗳️ Votes:</span> 
                      <span className="vote-yes">👍 {ans.voteYes || 0}</span> | 
                      <span className="vote-no">👎 {ans.voteNo || 0}</span>
                    </div>
                  ) : (
                    <div className="vote-prompt">
                      {hasAnswerId ? "No votes requested yet" : "Check with AI to enable voting"}
                    </div>
                  )}

                  {showVoteButtons && (
                    <div className="vote-buttons">
                      <button 
                        className={`vote-btn ${userVote === 'yes' ? 'voted-yes' : ''}`}
                        disabled={loading}
                        onClick={() => handleCastVote(idx, true)}
                      >
                        {userVote === 'yes' ? '✅ Voted Yes' : '👍 Vote Yes'}
                      </button>
                      <button 
                        className={`vote-btn ${userVote === 'no' ? 'voted-no' : ''}`}
                        disabled={loading}
                        onClick={() => handleCastVote(idx, false)}
                      >
                        {userVote === 'no' ? '❌ Voted No' : '👎 Vote No'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="final-decision">
                  <span className="final-label">🏆 Final Decision:</span>{" "}
                  <span className={finalCorrect ? 'correct-text' : 'incorrect-text'}>
                    {finalCorrect ? "✨ Correct! ✨" : "💥 Incorrect 💥"}
                    {ans.adminOverride && " (Admin Override)"}
                  </span>
                </div>

                <div className="action-buttons">
                  <div className="primary-actions">
                    <button 
                      className="action-btn ai-check-btn" 
                      disabled={loading} 
                      onClick={() => handleCheckAI(idx)}
                    >
                      🔍 Check with AI
                    </button>

                    {canRequestVote && (
                      <button 
                        className="action-btn request-vote-btn" 
                        disabled={loading} 
                        onClick={() => handleRequestVote(idx)}
                      >
                        ✋ Request Community Vote
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="admin-actions">
                      <button 
                        className="action-btn override-correct-btn" 
                        disabled={loading} 
                        onClick={() => handleOverride(idx, true)}
                      >
                        👍 Override: Correct
                      </button>
                      <button 
                        className="action-btn override-incorrect-btn" 
                        disabled={loading} 
                        onClick={() => handleOverride(idx, false)}
                      >
                        👎 Override: Incorrect
                      </button>
                    </div>
                  )}
                </div>

                {/*<div className="debug-row-info">
                  <small>
                    AnswerID: {ans.answerId || 'none'} | 
                    VoteRequested: {ans.voteRequested ? 'yes' : 'no'} | 
                    Override: {ans.adminOverride ? 'yes' : 'no'}
                  </small>
                </div>*/}
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