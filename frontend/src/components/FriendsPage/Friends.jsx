import React, { useEffect, useState } from 'react';
import Layout from '../Layout/Layout';
import './Friends.css';
import { API_URL } from '../../config';
import LocalStorageUtils from '../../LocalStorageUtils';
import { useAppContext } from "../../ContextProvider";
import defaultProfilePic from '../../assets/Default_pfp.jpg';

const Friends = () => {
  const { createChat, setIsChatMenuOpen } = useAppContext();
  const token = LocalStorageUtils.getToken();
  const username = LocalStorageUtils.getUsername();

  const [friendUsername, setFriendUsername] = useState("");
  const [friendMessage, setFriendMessage] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${API_URL}/friends/get-all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      } else {
        console.error("Error fetching friends:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const handleFriendAction = async (event, action) => {
    event.preventDefault();
    if (!token) {
      setFriendMessage("❌ You must be logged in to perform this action.");
      return;
    }

    const endpoint = (action === "add") ? "add" : "remove";
    try {
      const response = await fetch(`${API_URL}/friends/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          [`${action}FriendUsername`]: friendUsername
        })
      });
      const data = await response.json();
      if (response.ok) {
        setFriendMessage(`✅ ${friendUsername} has been ${action}ed successfully!`);
        fetchFriends();
      } else {
        setFriendMessage(`❌ ${data.message || "Failed to update friend list"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setFriendMessage(`❌ Failed to ${action} friend.`);
    }
  };

  const handleViewProfile = async (friendName) => {
    try {
      const response = await fetch(`${API_URL}/profile?username=${friendName}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedProfile(data);
        setIsModalOpen(true);
      } else {
        setFriendMessage(`❌ ${data.error || "Failed to fetch profile"}`);
      }
    } catch (err) {
      console.error("Error fetching friend profile:", err);
      setFriendMessage("❌ Server error fetching profile");
    }
  };

  const handleStartChat = (friendUsername) => {
    createChat(friendUsername);
    setIsChatMenuOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  const getFriendPicSrc = (profile) => {
    if (!profile) return defaultProfilePic;

    if (profile.profile_pic_base64 && profile.profile_pic_base64.trim() !== "") {
      if (profile.profile_pic_base64.startsWith('data:image')) {
        return profile.profile_pic_base64;
      }
      return `data:image/png;base64,${profile.profile_pic_base64}`;
    }
    
    if (profile.profile_pic) {
      if (profile.profile_pic.startsWith('/')) {
        return `${API_URL}${profile.profile_pic}`;
      }
      return profile.profile_pic;
    }

    return defaultProfilePic;
  };

  return (
    <Layout>
      <div className="friends-page">
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
              🌟 My Friends 🌟
           </h1>
        
        {/* Friends List */}
        <div className="friends-section">
          <h2 className="section-title">👥 My Friend Squad</h2>
          {friends.length > 0 ? (
            <ul className="friends-list">
              {friends.map((friend, index) => (
                <li key={index} className="friend-item">
                  <span className="friend-username">✨ {friend}</span>
                  <div className="friend-actions">
                    <button 
                      className="friend-action-btn chat-btn"
                      onClick={() => handleStartChat(friend)}
                    >
                      💬 Chat
                    </button>
                    <button 
                      className="friend-action-btn profile-btn"
                      onClick={() => handleViewProfile(friend)}
                    >
                      👀 View Profile
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-friends">You don't have any friends yet. Add some below!</p>
          )}
        </div>

        {/* Add/Remove Friends */}
        <div className="manage-friends-section">
          <h2 className="section-title">🛠️ Manage Friends</h2>
          <p className="logged-in-user">
            Logged in as: <span className="username-highlight">{username || "Loading..."}</span>
          </p>
          
          <form className="friends-form">
            <div className="form-group">
              <label htmlFor="friend-name" className="form-label">
                Enter Friend's Username:
              </label>
              <input
                id="friend-name"
                type="text"
                name="friendUsername"
                placeholder="Type username here..."
                value={friendUsername}
                onChange={(event) => setFriendUsername(event.target.value)}
                autoComplete="off"
                className="friend-input"
              />
            </div>
            
            <div className="action-buttons">
              <button 
                className="action-btn add-btn"
                onClick={(event) => handleFriendAction(event, "add")}
              >
                ➕ Add Friend
              </button>
              <button 
                className="action-btn remove-btn"
                onClick={(event) => handleFriendAction(event, "remove")}
              >
                ➖ Remove Friend
              </button>
            </div>
          </form>
          
          {friendMessage && (
            <p className={`friend-message ${friendMessage.includes('❌') ? 'error' : 'success'}`}>
              {friendMessage}
            </p>
          )}
        </div>

        {/* Friend Profile Modal */}
        {isModalOpen && selectedProfile && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={closeModal}>
                ✖
              </button>
              
              <h3 className="profile-modal-title">
                🎯 {selectedProfile.username}'s Profile
              </h3>
              
              <div className="profile-pic-container">
                <img
                  src={getFriendPicSrc(selectedProfile)}
                  alt="Profile"
                  className="profile-pic"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = defaultProfilePic;
                  }}
                />
              </div>
              
              <div className="profile-details">
                <div className="profile-detail">
                  <span className="detail-label">📧 Email:</span>
                  <span className="detail-value">{selectedProfile.email || "Not shared"}</span>
                </div>
                <div className="profile-detail">
                  <span className="detail-label">🤝 Friends:</span>
                  <span className="detail-value">{selectedProfile.friend_count || 0}</span>
                </div>
                <div className="profile-detail">
                  <span className="detail-label">🏆 Games Won:</span>
                  <span className="detail-value">{selectedProfile.games_won || 0}</span>
                </div>
                <div className="profile-detail">
                  <span className="detail-label">🎮 Games Played:</span>
                  <span className="detail-value">{selectedProfile.games_played || 0}</span>
                </div>
              </div>
              <button 
                className="friend-action-btn chat-btn"
                style={{ marginTop: '20px', width: '100%' }}
                onClick={() => {
                  handleStartChat(selectedProfile.username);
                  closeModal();
                }}
              >
                💬 Start Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Friends;