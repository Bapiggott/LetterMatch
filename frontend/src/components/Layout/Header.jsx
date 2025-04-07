import { useState, useRef, useEffect } from "react";
import { API_URL } from "../../config";
import LocalStorageUtils from "../../LocalStorageUtils";

const Header = () => {
    const MAX_HAMBURGER_SCREEN_SIZE = 800
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false)
    const userMenuRef = useRef(null);
    const hamburgerMenuRef = useRef(null)
    const [showHamburger, setShowHamburger] = useState(window.innerWidth <= MAX_HAMBURGER_SCREEN_SIZE);

    useEffect(() => {
        const handleScreenResize = () => setShowHamburger(window.innerWidth <= MAX_HAMBURGER_SCREEN_SIZE)
        window.addEventListener("resize", handleScreenResize)
        
        return () => window.removeEventListener("resize", handleScreenResize)
    }, []);


    useEffect(() => {
        // Check if a token is present in localStorage
        const token = LocalStorageUtils.getToken()
        setIsLoggedIn(!!token); 
    }, []);

    const handleLogout = () => {
        LocalStorageUtils.removeToken()
        LocalStorageUtils.removeUsername()
        setIsLoggedIn(false);
        window.location.href = "/login";
    };



    useEffect(() => {
        function handleClickOutsideUserMenu(event) {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
            setIsUserMenuOpen(false);
        }
        }
        document.addEventListener("mousedown", handleClickOutsideUserMenu);
        return () => document.removeEventListener("mousedown", handleClickOutsideUserMenu);
    }, []);

    useEffect(() => {
        function handleClickOutsideHamburgerMenu(event) {
        if (hamburgerMenuRef.current && !hamburgerMenuRef.current.contains(event.target)) {
            setIsHamburgerMenuOpen(false);
        }
        }
        document.addEventListener("mousedown", handleClickOutsideHamburgerMenu);
        return () => document.removeEventListener("mousedown", handleClickOutsideHamburgerMenu);
    }, []);

    return (
        <header >
            <a href="/home">
                <div className='logo-div'>
                    <box-icon name='extension'></box-icon>
                    <div>Letter Match</div>
                </div>
            </a>
            {!showHamburger && (
                <nav className="desktop-nav">
                    <ul>
                        <a href='/games'><li>Games</li></a>
                        <a href="/friends"><li>Friends</li></a>
                    </ul>
                    <div className="call-to-action-div">
                        {isLoggedIn ? (
                            <>
                                <div>
                                    <span className="hello-user-span">Hi { LocalStorageUtils.getUsername() || "Unknown" }!</span>
                                </div>
                                <div className="user-icon-div" ref={userMenuRef}>
                                    <box-icon onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} name='user-circle' ></box-icon>
                                    {isUserMenuOpen && (
                                    <div className="user-icon-dropdown-menu">
                                        <ul>
                                            <a href="/profile"><li>Profile</li></a>
                                            <a href="/settings"><li>Settings</li></a>
                                            <a href="#" onClick={handleLogout} ><li>Logout</li></a>
                                        </ul>
                                    </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <a className="header-style-btn" href="/login"><li>Login</li></a>
                                <a className="header-style-btn" href="/register"><li>Register For Free</li></a>
                            </>
                        )}
                    </div>
                </nav>
            )}
            {showHamburger && (
                <nav className="mobile-nav" ref={hamburgerMenuRef}>
                    <div>
                        <box-icon name='menu' onClick={() => setIsHamburgerMenuOpen(!isHamburgerMenuOpen)}></box-icon>
                    </div>
                    {isHamburgerMenuOpen && (
                        <ul className="hamburger-menu">
                            <a href="/home"><li>Home</li></a>
                            <a href='/games'><li>Games</li></a>
                            <a href="/friends"><li>Friends</li></a>  
                            <a href="/profile"><li>Profile</li></a>
                            <a href="/settings"><li>Settings</li></a>
                            <a href="#" onClick={handleLogout}s ><li>Logout</li></a>
                            <li className="mimic-header-link" onClick={() => setIsHamburgerMenuOpen(!isHamburgerMenuOpen)}>Close</li>
                        </ul>
                    )}
                </nav>
            )}
        </header>
    );
};

export default Header;
