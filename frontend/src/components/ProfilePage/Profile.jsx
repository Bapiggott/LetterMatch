import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { API_URL } from '../../config';
import LocalStorageUtils from '../../LocalStorageUtils';
import './Profile.css';

const Profile = () => {
  const token = LocalStorageUtils.getToken();
  const username = LocalStorageUtils.getUsername();
  const [profileData, setProfileData] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchProfile();
    fetchGameHistory();
  }, []);

  const fetchProfile = async () => {
    if (!token || !username) {
      setStatus("❌ Not logged in or missing username");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Username": username
        }
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`❌ ${data.error || "Failed to fetch profile"}`);
      } else {
        setProfileData(data);
        setStatus("");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setStatus("❌ Server error");
    }
  };

  const fetchGameHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/games/history?username=${username}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Username": username
        }
      });
      const data = await res.json();
      if (res.ok) {
        setGameHistory(data.games || []);
      }
    } catch (err) {
      console.error("Error fetching game history:", err);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatus("❌ No file selected!");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("image", selectedFile);

      const res = await fetch(`${API_URL}/profile/upload_pic_base64`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Username": username
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`❌ ${data.error || "Upload failed"}`);
      } else {
        setStatus("✅ " + data.message);
        fetchProfile();
      }
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("❌ Server error uploading pic");
    }
  };

  const getDataUrl = () => {
    if (!profileData?.profile_pic_base64) return null;
    return `data:image/png;base64,${profileData.profile_pic_base64}`;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Layout>
      <div className="profile-container">
        <div className="profile-header">
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
                    🌟 My Awesome Profile 🌟
                </h1>
         
          {status && <p className={`status-message ${status.includes('❌') ? 'error' : 'success'}`}>{status}</p>}
        </div>

        <div className="profile-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 My Profile
          </button>
          <button 
            className={`tab-button ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => setActiveTab('games')}
          >
            🎮 Game History
          </button>
        </div>

        {activeTab === 'profile' && profileData && (
          <div className="profile-content">
            <div className="profile-card">
              <div className="profile-pic-container">
                {profileData.profile_pic_base64 ? (
                  <img
                    src={getDataUrl()}
                    alt="Profile"
                    className="profile-pic"
                  />
                ) : (
                  <div className="default-profile-pic">👾</div>
                )}
              </div>

              <div className="profile-info">
                <div className="profile-item">
                  <span className="profile-label">🦸 Username:</span>
                  <span className="profile-value">{profileData.username}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">📧 Email:</span>
                  <span className="profile-value">{profileData.email}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">🤝 Friends:</span>
                  <span className="profile-value">{profileData.friend_count || 0}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">🏆 Games Won:</span>
                  <span className="profile-value">{profileData.games_won || 0}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">🎮 Games Played:</span>
                  <span className="profile-value">{profileData.games_played || 0}</span>
                </div>
              </div>
            </div>

            <div className="upload-section">
              <h3 className="upload-title">🖼️ Update My Picture</h3>
              <div className="upload-controls">
                <label className="file-upload-button">
                  📁 Choose File
                  <input type="file" onChange={handleFileChange} className="file-input" />
                </label>
                <button onClick={handleUpload} className="upload-button">
                  🚀 Upload
                </button>
              </div>
              {selectedFile && (
                <p className="file-selected">Selected: {selectedFile.name}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <div className="game-history">
            <h3 className="history-title">⏳ My Game Adventures</h3>
            {gameHistory.length === 0 ? (
              <p className="no-games">No games played yet. Let's play one!</p>
            ) : (
              <div className="games-list">
                {gameHistory.map((game, index) => (
                  <div key={index} className={`game-card ${game.winner === username ? 'won' : ''}`}>
                    <div className="game-header">
                      <span className="game-date">{formatDate(game.created_at)}</span>
                      {game.winner === username && (
                        <span className="winner-badge">🏆 Winner!</span>
                      )}
                    </div>
                    <div className="game-details">
                      <span className="game-room">🏠 Room: {game.room_name}</span>
                      <span className="game-players">👥 Players: {game.players.join(', ')}</span>
                      <span className="game-score">🎯 Your Score: {game.scores[username] || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;