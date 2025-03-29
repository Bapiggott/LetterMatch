import React from 'react';
import { useEffect, useState, useMemo } from "react";
import { useAppContext } from "../../ContextProvider";
import LocalStorageUtils from '../../LocalStorageUtils';
import { API_URL } from '../../config';


const Chat = () => {
    const { 
        isChatMenuOpen, 
        setIsChatMenuOpen, 
        focusedChatId, 
        setFocusedChatId, 
        chats, 
        createMessage,
        fetchChats, 
        getFocusedChat,
        totalUnreadMessages,
        readChat
    } = useAppContext();
    
    const [inputtedMessage, setInputtedMessage] = useState("");

    useEffect(() => {
        fetchChats();
    }, []);



    const handleMessageSubmit = (event) => {
        event.preventDefault()

        createMessage(
          LocalStorageUtils.getUsername(), 
          getFocusedChat().username, 
          inputtedMessage
        )
        setInputtedMessage(""); 
      };

      const removeChat = async (chatId) => {
        try {
          const response = await fetch(`${API_URL}/chat/remove-chat`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LocalStorageUtils.getToken()}`
              },
              body: JSON.stringify({ chat_id: chatId }) 
            });
          if (!response.ok) {
              console.log("Error removing chat")
          }
          const data = await response.json();
          console.log(data)
          fetchChats()
  
        } catch (error) {
            console.error(error);
        }
      }


    

    return (
    <>
        <div className='chat-div'>

          <div className='corner-icons-div' onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}>
            <div className='chat-corner-icon'><box-icon name='message-dots'></box-icon></div>

            {chats && chats.length > 0 && totalUnreadMessages > 0 &&(
              <div className='unread-message-alert-div'>
                <span>{totalUnreadMessages < 100 ? totalUnreadMessages : "99+"}</span>
              </div>
            )}
          </div>

            {(isChatMenuOpen && focusedChatId == null) && (
            <div className="chat-menu all-chats-view">
              
                <h6>Chats</h6>

                <ul>

                {chats.length > 0 ? (
                chats.map((chat) => (
                  <li className='chat-li' key={chat.chat_id}>
                    <div onClick={() => {setFocusedChatId(chat.chat_id); readChat(chat.chat_id);}}>
                      <div className='unread-chat-messages-div-container'>
                        {chat.unread_message_count > 0 && (
                          <div className='unread-chat-messages-div'>{chat.unread_message_count}</div>

                        )}
                      </div>
                      <div className='username'>{chat.username}</div>
                      <div className='last-message'>  {chat.messages[0]?.message_body.slice(0, 12)}{chat.messages[0]?.message_body.length > 15 ? " . . . " : null}

                      </div>
                    </div>
                    <div className='x-icon-div'>
                      <box-icon name='x' onClick={() => removeChat(chat.chat_id)}></box-icon>
                    </div>
                  </li>
                ))
              ) : (
                <li>You don't seem to have any active chats.</li>
              )}
                </ul>
            </div>
            )}

            {(isChatMenuOpen && focusedChatId && getFocusedChat()) && (
            <div className="chat-menu chat-focus-view">
                <box-icon className="back-btn" name="arrow-back" onClick={() => setFocusedChatId(null)}></box-icon>
                <h6>{getFocusedChat().username}</h6>
                <div className='messages-div'>
                    {getFocusedChat().messages && getFocusedChat().messages.length > 0 ? (
                    getFocusedChat().messages.map((message) => (
                        <div className={'chat-message-div ' + (message.username == LocalStorageUtils.getUsername() ? 'you-message' : 'them-message')} key={message.message_id}>
                            <span>{message.username} </span>
                            <p>{message.message_body}</p>
                        </div>
                    ))
                    ) : (
                    <span>There are no messages yet.</span>
                    )}
                </div>
                <form onSubmit={handleMessageSubmit}>
                    <input value={inputtedMessage} onChange={(e) => setInputtedMessage(e.target.value)} type="text" name="message_body" autocomplete="off" required/>
                    <button type="submit"><box-icon name='paper-plane'></box-icon></button>
                </form>
            </div>
            )}


        </div>
    </>
    );
};

export default Chat;
