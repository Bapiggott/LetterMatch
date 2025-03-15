import React, { useEffect, useState } from 'react';
import Layout from '../Layout/Layout';
import './Friends.css';
import { API_URL } from '../../config';
import { getUsername, getToken } from '../../CookieUtils';

const Friends = () => {

    const token = getToken()
    const username = getUsername()

    const [addFriendUsername, setAddFriendUsername] = useState("");
    const [addFriendMessage, setAddFriendMessage] = useState("");
    const [friends, setFriends] = useState([])

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
                console.log(response.friends)
                setFriends(data.friends); 
            } else {
                console.error("Error fetching friends: ", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching friends:", error);
        }
    };
    



    const addFriend = async (event) => {
        event.preventDefault();
        try {
            if (!token) {
                setAddFriendMessage("❌ You must be logged in to add a friend.");
                return;
            }

            const response = await fetch(`${API_URL}/friends/add`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: getUsername(),
                    addFriendUsername: addFriendUsername
                })
            });

            const data = await response.json();
            if (response.ok) {
                setAddFriendMessage(`✅ ${addFriendUsername} has been added as a friend!`);
            } else {
                setAddFriendMessage(`❌ ${data.message}`);
            }
        } catch (error) {
            console.error("Error:", error);
            setAddFriendMessage("❌ Failed to add friend.");
        }
        fetchFriends()
    };

    return (
        <Layout>
        <div className='friends-list'>
            <ul>
                {friends.length > 0 ? (
                friends.map((friend, index) => (
                    //Remove inline styling later
                    <li style={{ color:"black"}} key={index}>{friend}</li>
                ))
                ) : (
                <p>No friends found</p>
                )}
            </ul>
        </div>
            <div className="friends-container">
                <h1>Friends</h1>
                <p className="logged-in-user">Logged in as: <b>{username || "Loading..."}</b></p>

                <div className="friends-form">
                    <form onSubmit={addFriend} method='POST'>
                        <label htmlFor="add-friend-name">Friend to add:</label>
                        <input 
                            onChange={(event) => setAddFriendUsername(event.target.value)} 
                            id='add-friend-name' 
                            type="text" 
                            name="addFriendUsername"
                            placeholder="Enter username..."
                        />
                        <button type='submit'>Add Friend</button>
                    </form>
                    {addFriendMessage && <p className="friend-message">{addFriendMessage}</p>}
                </div>
            </div>
            
        </Layout>
    );
};

export default Friends;