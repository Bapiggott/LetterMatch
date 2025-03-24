
import { createContext, useState, useEffect, useContext } from "react";
import { io } from 'socket.io-client';
import { API_URL } from "./config";
import LocalStorageUtils from "./LocalStorageUtils";

const AppContext = createContext();

export const ContextProvider = ({ children }) => {

        const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
        const [chatFocus, setChatFocus] = useState(null)
        const [chats, setChats] = useState([]);
        const [socket, setSocket] = useState(null);


        useEffect(() => {
            const socket = io(API_URL);
            setSocket(socket);
        
            return () => {
                socket.close();
            };
          }, []);



        const createChat = (senderUsername, recipientUsername) => {
            if (socket) {
                socket.emit("create_chat", { sender_username: senderUsername, recipient_username: recipientUsername });
            } else {
                console.log("Socket is not connected");
            }
        };

        const createMessage = (senderUsername, recipientUsername, messageBody) => {
            if (socket) {
                socket.emit("create_message", { sender_username: senderUsername, recipient_username: recipientUsername, message_body: messageBody });
            } else {
                console.log("Socket is not connected");
            }
        };
        


        useEffect(() => {
            if (socket) {
                socket.on("chat_created", (data) => {
                    console.log("Chat Created:", data);
                    setChats(data.chat_details);
                    setChatFocus(data.new_chat)
                    setIsChatMenuOpen(true);
                });
        
                socket.on("message_created", (data) => {
                    console.log("Update Chats:", data);
                    setChats(data.chat_details);
                    const updatedChat = data.chat_details.find(chat => chat.chat_id == chatFocus?.chat_id);
                    if (updatedChat) {
                        setChatFocus(updatedChat);
                    } else {
                        setChatFocus(null); 
                    }
                })
            }
        }, [socket, chatFocus])
        

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




    return (
        <AppContext.Provider value={{ 
            isChatMenuOpen, setIsChatMenuOpen,
            chatFocus, setChatFocus,
            chats, setChats,
            socket, setSocket,
            createChat,
            createMessage,
            fetchChats
         }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
