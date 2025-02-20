// Friends.jsx
import React from 'react';
import Layout from '../Layout/Layout';
import './Friends.css'
import { API_URL } from '../../config';
import { useState } from 'react';

const Friends = () => {

    const [addFriendUsername, setAddFriendUsername] = useState("")

    const updateAddFriendUsername = (event) => {
        setAddFriendUsername(event.target.value);
    }

    const addFriend = async () => {
        try {

            event.preventDefault()

            const response = await fetch(`${API_URL}/add-friend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                        username: "user234",
                        addFriendUsername: addFriendUsername
                    })
            })

            if (!response.ok) {
                throw new Error("API response not okay.")
            }

            const data = await response.json()
            console.log(data)
        } catch (error) {
            console.error("Error:", error)
        }
    }


    return (
        <Layout>
            <div>
                <h2>Friends</h2>
                <form onSubmit={addFriend}  method='POST'>
                    <label htmlFor="add-friend-name">Friend to add: </label>
                    <input onChange={updateAddFriendUsername} id='add-friend-name' type="text" name="addFriendUsername"/>
                    <button type='submit'>Add Friend</button>
                </form>
            </div>
        </Layout>
    );
};

export default Friends;
