import React, { useEffect, useState } from 'react';
import Layout from '../Layout/Layout';
import './Friends.css';
import { API_URL } from '../../config';
import LocalStorageUtils from '../../LocalStorageUtils';
import { useAppContext } from "../../ContextProvider";


const Friends = () => {

    const { 
        createChat
    } = useAppContext();

  const token = LocalStorageUtils.getToken();
  const username = LocalStorageUtils.getUsername();

  const [friendUsername, setFriendUsername] = useState("");
  const [friendMessage, setFriendMessage] = useState("");
  const [friends, setFriends] = useState([]);

  // For viewing a friend’s profile in a modal
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  // 1) Fetch friend list
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

  // 2) Add/Remove friend
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
        fetchFriends(); // Refresh list
      } else {
        setFriendMessage(`❌ ${data.message || "Failed to update friend list"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setFriendMessage(`❌ Failed to ${action} friend.`);
    }
  };

  // 3) View a friend’s profile (opens a modal)
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
        // data might have fields like { username, email, friend_count, profile_pic, profile_pic_base64, games_won, games_played }
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

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  // Helper to decide which image src to show:
  // 1) If the friend has a base64 string, show it as data:image/png;base64,... 
  // 2) Else if they have a normal path in "profile_pic", use that
  // 3) Else fallback to "/default_profile.png"
  const getFriendPicSrc = (profile) => {
    if (!profile) return "/default_profile.png";

    if (profile.profile_pic_base64 && profile.profile_pic_base64.trim() !== "") {
      // they have a base64 stored in the DB
      return `data:image/png;base64,${profile.profile_pic_base64}`;
    } else if (profile.profile_pic) {
      // they have a stored path
      return profile.profile_pic;
    } else {
      // no image, use default
      return "/default_profile.png";
    }
  };

  return (
    <Layout>
      <h1>Friends</h1>

      {/* Friend list */}
      <div className="friends-list">
        <h2>Friends List</h2>
        <ul>
          {friends.length > 0 ? (
            friends.map((friend, index) => (
              <li key={index}>
                {friend}{" "}
                <button onClick={() => createChat(friend)}>Chat</button>
                <button onClick={() => handleViewProfile(friend)}>View Profile</button>
              </li>
            ))
          ) : (
            <p>No friends found</p>
          )}
        </ul>
      </div>

      {/* If a friend’s profile is selected, show in a modal */}
      {isModalOpen && selectedProfile && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Profile of {selectedProfile.username}</h3>
            <p>Email: {selectedProfile.email}</p>
            <p>Friend Count: {selectedProfile.friend_count}</p>

            {/* Only show the friend’s image if it isn't empty */}
            <img
              src={getFriendPicSrc(selectedProfile)}
              alt="Profile"
              style={{ width: "100px", height: "100px" }}
            />

            <p>Games Won: {selectedProfile.games_won}</p>
            <p>Games Played: {selectedProfile.games_played}</p>

            <button className="close-modal-btn" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Manage friends (Add/Remove) */}
      <div className="friends-container">
        <h2>Manage Friends</h2>
        <p className="logged-in-user">
          Logged in as: <b>{username || "Loading..."}</b>
        </p>
        <div className="friends-form">
          <form>
            <label htmlFor="friend-name">Enter Friend's Username:</label>
            <input 
              id='friend-name' 
              type="text"
              name="friendUsername"
              placeholder="Enter username..."
              value={friendUsername}
              onChange={(event) => setFriendUsername(event.target.value)}
            />
            <div className="button-group">
              <button onClick={(event) => handleFriendAction(event, "add")}>
                Add Friend
              </button>
              <button 
                onClick={(event) => handleFriendAction(event, "remove")} 
                className="remove-btn"
              >
                Remove Friend
              </button>
            </div>
          </form>
          {friendMessage && <p className="friend-message">{friendMessage}</p>}
        </div>
      </div>
    </Layout>
  );
};

export default Friends;
