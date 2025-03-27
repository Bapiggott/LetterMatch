import React from 'react';
import { useEffect, useState } from "react";
import { useAppContext } from "../../ContextProvider";
import LocalStorageUtils from '../../LocalStorageUtils';


const Chat = () => {
    const { 
        isChatMenuOpen, 
        setIsChatMenuOpen, 
        chatFocus, 
        setChatFocus, 
        chats, 
        createMessage,
        fetchChats
    } = useAppContext();

    const [inputtedMessage, setInputtedMessage] = useState("");


    useEffect(() => {
        fetchChats();
    }, []);



    const handleMessageSubmit = (event) => {
        event.preventDefault()
        createMessage(
          LocalStorageUtils.getUsername(), 
          chatFocus.username, 
          inputtedMessage
        )
        setInputtedMessage(""); 
      };

    

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
                    <div>{chat.messages[0]?.message_body.slice(0, 15)}</div>
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
                <h6 className='username-heading'>{chatFocus.username}</h6>
                <div className='messages-div'>
                    {chatFocus.messages && chatFocus.messages.length > 0 ? (
                    chatFocus.messages.map((message) => (
                        <div className='chat-message-div' key={message.message_id}>
                            <span>{message.username} </span>
                            <p>{message.message_body}</p>
                        </div>
                    ))
                    ) : (
                    <span>There are no messages yet.</span>
                    )}
                </div>
                <form onSubmit={handleMessageSubmit}>
                    <input value={inputtedMessage} onChange={(e) => setInputtedMessage(e.target.value)} type="text" name="message_body" required/>
                    <button type="submit"><box-icon name='paper-plane'></box-icon></button>
                </form>
            </div>
            )}


        </div>
    </>
    );
};

export default Chat;
