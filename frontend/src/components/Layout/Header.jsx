import { useState, useRef, useEffect } from "react";
import { API_URL } from "../../config";

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const [loggedInUser, setLoggedInUser] = useState(null);

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

    useEffect(() => {
        // Fetch logged-in user from session storage or API
        const fetchUser = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                console.error("Error fetching user");
                return;
            }
            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setLoggedInUser(data.username);
                } else {
                    console.error("Error fetching user");
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            }
        };

        fetchUser();
    }, []);



    useEffect(() => {
        function handleClickOutsideUserMenu(event) {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
            setIsUserMenuOpen(false);
        }
        }
        document.addEventListener("mousedown", handleClickOutsideUserMenu);
        return () => document.removeEventListener("mousedown", handleClickOutsideUserMenu);
    }, []);

    return (
        <header  ref={userMenuRef}>
            <a href="/home">
                <div className='logo-div'>
                    <box-icon name='game'></box-icon>
                    <div>Letter Match</div>
                </div>
            </a>
            <nav>
                <ul>
                    <a href="/home"><li>Home</li></a>
                    <a href='/games'><li>Games</li></a>
                    <a href="/friends"><li>Friends</li></a>
                </ul>
                <div className="call-to-action-div">
                    {isLoggedIn ? (
                        <>
                            <div>
                                <span className="hello-user-span">hi, { loggedInUser || "Unknown" }</span>
                            </div>
                            <div className="user-icon-div">
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
        </header>
    );
};

export default Header;
