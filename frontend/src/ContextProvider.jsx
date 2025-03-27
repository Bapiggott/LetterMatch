
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
            const newSocket = io(API_URL, {
              auth: {
                token: LocalStorageUtils.getToken(),
              },
            });
          
            setSocket(newSocket);
          
            newSocket.on("connect", () => {
              console.log("Socket connected:", newSocket.id);
              newSocket.emit("join_chat_rooms", { token: LocalStorageUtils.getToken() });
            });
          
            newSocket.on("joined_chat_rooms", (data) => {
              console.log("Joined rooms:", data.rooms);
            });
    
            return () => {
              newSocket.disconnect();
            };
        }, []);
        
        useEffect(() => {
            if (socket) {
                socket.on("chat_created", (data) => {
                    console.log("Chat Created:", data);
                    setChats(data.chat_details);
                    setChatFocus(data.new_chat)
                    setIsChatMenuOpen(true);
                });
        
                socket.on("message_created", (data) => {
                    let focusedChatId = chatFocus?.chat_id || null 
                    setChats(data.chat_details);
                    if(focusedChatId){
                        console.log("focused", focusedChatId)
                        const focusedChat = data.chat_details.find(chat => chat.chat_id === focusedChatId);
                        setChatFocus(focusedChat)
                    }
                })
            }
        }, [socket, chatFocus])


        const createChat = (recipientUsername) => {
            if (socket) {
                socket.emit("create_chat", { recipient_username: recipientUsername, token: LocalStorageUtils.getToken() });
            } else {
                console.log("Socket is not connected");
            }
        };

        const createMessage = (senderUsername, recipientUsername, messageBody) => {
            if (socket) {
                socket.emit("create_message", { sender_username: senderUsername, recipient_username: recipientUsername, message_body: messageBody, token: LocalStorageUtils.getToken() });
            } else {
                console.log("Socket is not connected");
            }
        };
        

        

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
