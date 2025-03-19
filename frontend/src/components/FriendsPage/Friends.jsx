import React, { useEffect, useState } from 'react';
import Layout from '../Layout/Layout';
import './Friends.css';
import { API_URL } from '../../config';
import LocalStorageUtils from '../../LocalStorageUtils';

const Friends = () => {
    const token = LocalStorageUtils.getToken();
    const username = LocalStorageUtils.getUsername();

    const [friendUsername, setFriendUsername] = useState("");
    const [friendMessage, setFriendMessage] = useState("");
    const [friends, setFriends] = useState([]);

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
                setFriends(data.friends);
            } else {
                console.error("Error fetching friends: ", response.statusText);
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

        const endpoint = action === "add" ? "add" : "remove";
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
                setFriendMessage(`❌ ${data.message}`);
            }
        } catch (error) {
            console.error("Error:", error);
            setFriendMessage(`❌ Failed to ${action} friend.`);
        }
    };

    return (
        <Layout>
            <div>
                <h1>Friends</h1>
            </div>
            <div className="friends-list">
                <h2>Friends List</h2>
                <ul>
                    {friends.length > 0 ? (
                        friends.map((friend, index) => <li key={index}>{friend}</li>)
                    ) : (
                        <p>No friends found</p>
                    )}
                </ul>
            </div>
            <div className="friends-container">
                <h2>Manage Friends</h2>
                <p className="logged-in-user">Logged in as: <b>{username || "Loading..."}</b></p>

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
                            <button onClick={(event) => handleFriendAction(event, "add")}>Add Friend</button>
                            <button onClick={(event) => handleFriendAction(event, "remove")} className="remove-btn">Remove Friend</button>
                        </div>
                    </form>
                    {friendMessage && <p className="friend-message">{friendMessage}</p>}
                </div>
            </div>
        </Layout>
    );
};

export default Friends;
