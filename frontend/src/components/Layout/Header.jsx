import React, { useState, useEffect } from "react";

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check if a token is present in localStorage
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token); 
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username"); 
        setIsLoggedIn(false);
        window.location.href = "/login";
    };

    return (
        <header>
            <div className='logo-div'>
                <img className='logo' src='./puzzle-icon-no-fill-white.png' alt='Letter Match Logo' />
                <div>Letter Match</div>
            </div>
            <nav>
                <ul>
                    <a href="/home"><li>Home</li></a>
                    <a href='/games'><li>Games</li></a>
                    <a href="/friends"><li>Friends</li></a>
                    <a href="/profile"><li>My Profile</li></a>

                    {isLoggedIn ? (
                        <a href="#" onClick={handleLogout}><li>Logout</li></a>
                    ) : (
                        <>
                            <a href="/login"><li>Login</li></a>
                            <a href="/register"><li>Register For Free</li></a>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
};

export default Header;
