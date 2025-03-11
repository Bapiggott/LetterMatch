import React, { useState, useEffect } from 'react';
import './Footer.css';
import { API_URL } from "../../config";

const Footer = () => {
    const [role, setRole] = useState(null);

    // Fetch the current user on mount to know the role
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    console.error("No token found");
                    return;
                }
                const response = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setRole(data.role);
                } else {
                    console.error("Failed to fetch user data");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        fetchUser();
    }, []);
    
    const toggleRole = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                console.error("No token found");
                return;
            }
            const response = await fetch(`${API_URL}/auth/toggle-role`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                window.location.reload();
            } else {
                console.error("Failed to toggle role");
            }
        } catch (error) {
            console.error("Error toggling role:", error);
        }
    };

    return (
        <footer className="footer">
            <small>Copyright 2025</small>
            <button className="toggle-btn" onClick={toggleRole}>
                {role === 1 ? "Change to Admin" : "Change to Regular"}
            </button>
        </footer>
    );
};

export default Footer;
