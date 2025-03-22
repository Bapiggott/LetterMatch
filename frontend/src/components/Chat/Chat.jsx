import React from 'react';
import { useState, useRef, useEffect } from "react";
import { API_URL } from '../../config';
import LocalStorageUtils from '../../LocalStorageUtils';
import { useAppContext } from "../../ContextProvider";
import { io } from 'socket.io-client';


const Chat = () => {
    const { 
        isChatMenuOpen, 
        setIsChatMenuOpen, 
        chatFocus, 
        setChatFocus, 
        chats, 
        setChats,
        createChat
    } = useAppContext();

    // Get All Chats
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
            <div className="chat-menu all-chats-view">
                <ul>

                {chats.length > 0 ? (
                chats.map((chat) => (
                  <li key={chat.chat_id} onClick={() => setChatFocus(chat)}>
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
            <div className="chat-menu chat-focus-view">
                <box-icon name="arrow-back" onClick={() => setChatFocus(null)}></box-icon>
                <h6>{chatFocus.username}</h6>
                <div className='messages-div'>
                    {chatFocus.messages && chatFocus.messages.length > 0 ? (
                    chatFocus.messages.map((message) => (
                        <div>
                            <span>{message.username}</span>
                            <p>{message.message_body}</p>
                        </div>
                    ))
                    ) : (
                    <span>There are no messages yet.</span>
                    )}
                </div>
                <form>
                    <input type="text" name="message_body" required/>
                    <button type="submit">Send</button>
                </form>
            </div>
            )}


        </div>
    </>
    );
};

export default Chat;
