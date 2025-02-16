// Header.jsx
import React from 'react';

const Header = () => {
    return (
        <header>
            <div>
                <img class='logo' src='./logo.png' alt='Letter Match Logo'/>
            </div>
            <nav>
                <ul>
                    <a href="/"><li>Home</li></a>
                    <a href="/friends"><li>Friends</li></a>
                    <a href="/lettermatch"><li>LetterMatch</li></a>
                </ul>
            </nav>
        </header>
    );
};

export default Header;
