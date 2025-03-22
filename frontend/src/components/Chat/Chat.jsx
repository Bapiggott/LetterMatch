import React from 'react';
import { useState, useRef, useEffect } from "react";
import { API_URL } from '../../config';
import LocalStorageUtils from '../../LocalStorageUtils';
const Chat = () => {
    const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
    const [chatFocus, setChatFocus] = useState(null)
    const [chats, setChats] = useState([]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const response = await fetch(`${API_URL}/chat/get-chats`, {
                    method: "GET",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${LocalStorageUtils.getToken()}`
                    }
                  });
                if (!response.ok) {
                    console.log("Error getting chats")
                }
                const data = await response.json();
                console.log(data)
                setChats(data);
            } catch (error) {
                console.error(error);
            }
        };
    
        fetchChats();
    }, []);
    

    return (
    <>
        <div className='chat-div'>
            <div className='chat-corner-icon' onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}><box-icon name='message-dots'></box-icon></div>

            {(isChatMenuOpen && chatFocus == null) && (
            <div className="chat-menu">
                <ul>

                {chats.length > 0 ? (
                chats.map((chat) => (
                  <li key={chat.chat_id}>
                    <div>{chat.username}</div>
                    <div>{chat.messages[chat.messages.length - 1]?.message_body.slice(0, 15)}</div>
                    <box-icon name='x'></box-icon>
                  </li>
                ))
              ) : (
                <li>You don't seem to have any active chats.</li>
              )}
                </ul>
            </div>
            )}

            {(isChatMenuOpen && chatFocus != null) && (
                <></>
            )}

        </div>
    </>
    );
};

export default Chat;
