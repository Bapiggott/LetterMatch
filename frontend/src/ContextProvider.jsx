
import { createContext, useState, useEffect, useContext } from "react";
import { io } from 'socket.io-client';
import { API_URL } from "./config";

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
        


        
          useEffect(() => {
            if (socket) {
              socket.on("chat_created", (data) => {
                console.log("Chat Created:", data);
                setChatFocus(data.chat_details);
                setIsChatMenuOpen(true)
              });
            }
          }, [socket]);




    return (
        <AppContext.Provider value={{ 
            isChatMenuOpen, setIsChatMenuOpen,
            chatFocus, setChatFocus,
            chats, setChats,
            socket, setSocket,
            createChat
         }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
