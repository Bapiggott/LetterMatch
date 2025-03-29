
import { createContext, useState, useEffect, useContext, useRef } from "react";
import { io } from 'socket.io-client';
import { API_URL } from "./config";
import LocalStorageUtils from "./LocalStorageUtils";

const AppContext = createContext();

export const ContextProvider = ({ children }) => {

        const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
        const [focusedChatId, setFocusedChatId] = useState(null)
        const [chats, setChats] = useState([]);
        const [socket, setSocket] = useState(null);
        const getFocusedChat = () => chats.find(chat => chat.chat_id == focusedChatId);
        const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

        const newMessageSound = new Audio("/message-sound-low-vol.mp3");
        newMessageSound.volume = 0.7;

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
                    setFocusedChatId(data.new_chat.chat_id)
                    setIsChatMenuOpen(true);
                });
        
                socket.on("message_created", (data) => {
                    if(data.new_message_details.username != LocalStorageUtils.getUsername()){
                        newMessageSound.play();
                    }
                    fetchChats()
                })
            }
        }, [socket, focusedChatId])


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

        const readChat = async (chatId) => {
        try {
            const response = await fetch(`${API_URL}/chat/mark-chat-read`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LocalStorageUtils.getToken()}`
                },
                body: JSON.stringify({ chat_id: chatId }) 
            });
            if (!response.ok) {
                console.log("Error marking chat as read")
            }
            const data = await response.json();
            console.log(data)
            fetchChats()
    
        } catch (error) {
            console.error(error);
        }
        }

    useEffect(() => {
        if (getFocusedChat() == undefined) {
            setFocusedChatId(null);
        }

        if (focusedChatId && isChatMenuOpen) {
            const focusedChat = getFocusedChat();
            if (focusedChat) {
                const focusedChatUnreadMessages = focusedChat.unread_message_count;
    
                if (focusedChatUnreadMessages > 0) {
                    readChat(focusedChatId)
                }
            }
        }

        if (chats.length > 0){
            const newTotal = chats.reduce((total, chat) => total + chat.unread_message_count, 0);
            console.log(newTotal)
            console.log(chats)
            setTotalUnreadMessages(newTotal);
        }

        }, [chats]);



    return (
        <AppContext.Provider value={{ 
            isChatMenuOpen, setIsChatMenuOpen,
            focusedChatId, setFocusedChatId,
            chats, setChats,
            socket, setSocket,
            createChat,
            createMessage,
            fetchChats, 
            getFocusedChat,
            totalUnreadMessages, setTotalUnreadMessages,
            readChat
         }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
