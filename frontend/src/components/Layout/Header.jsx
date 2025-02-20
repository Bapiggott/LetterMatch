// Header.jsx
import React from 'react';

const Header = () => {
    return (
        <header>
            <div className='logo-div'>
                <img class='logo' src='./puzzle-icon-no-fill-white.png' alt='Letter Match Logo'/>
                <div>Letter Match</div>
            </div>
            <nav>
                <ul>
                    <a href="/home"><li>Home</li></a>
                    <a href='/games'><li>Games</li></a>
                    <a href="/friends"><li>Friends</li></a>
                    <a href="/profile"><li>My Profile</li></a>
                    <a href="/login"><li>Login</li></a>
                    <a href="/register"><li>Register For Free</li></a>
                </ul>
            </nav>
        </header>
    );
};

export default Header;
