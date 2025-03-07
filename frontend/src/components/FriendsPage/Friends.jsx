import React, { useEffect, useState } from 'react';
import Layout from '../Layout/Layout';
import './Friends.css';
import { API_URL } from '../../config';

const Friends = () => {
    const [addFriendUsername, setAddFriendUsername] = useState("");
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Fetch logged-in user from session storage or API
        const fetchUser = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                window.location.href = "/login"; // Redirect if not logged in
                return;
            }
            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setLoggedInUser(data.username);
                } else {
                    window.location.href = "/login";
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                window.location.href = "/login";
            }
        };

        fetchUser();
    }, []);

    const updateAddFriendUsername = (event) => {
        setAddFriendUsername(event.target.value);
    };

    const addFriend = async (event) => {
        event.preventDefault();
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setMessage("❌ You must be logged in to add a friend.");
                return;
            }

            const response = await fetch(`${API_URL}/add-friend`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: loggedInUser,
                    addFriendUsername: addFriendUsername
                })
            });

            const data = await response.json();
            if (response.ok) {
                setMessage(`✅ ${addFriendUsername} has been added as a friend!`);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error) {
            console.error("Error:", error);
            setMessage("❌ Failed to add friend.");
        }
    };

    return (
        <Layout>
            <div className="friends-container">
                <h1>Friends</h1>
                <p className="logged-in-user">Logged in as: <b>{loggedInUser || "Loading..."}</b></p>

                <div className="friends-form">
                    <form onSubmit={addFriend} method='POST'>
                        <label htmlFor="add-friend-name">Friend to add:</label>
                        <input 
                            onChange={updateAddFriendUsername} 
                            id='add-friend-name' 
                            type="text" 
                            name="addFriendUsername"
                            placeholder="Enter username..."
                        />
                        <button type='submit'>Add Friend</button>
                    </form>
                    {message && <p className="friend-message">{message}</p>}
                </div>
            </div>
            
        </Layout>
    );
};

export default Friends;