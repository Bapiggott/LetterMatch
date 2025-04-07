import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./LoginForm.css";
import Layout from "../Layout/Layout";

const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!isValidEmail(email)) {
            setError("Invalid email address");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.user.username);

            setSuccess("Login successful! Redirecting...");
            setTimeout(() => window.location.href = "/home", 2000);

        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <Layout>
            <div className="login-form">
            <h1
                style={{
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    marginBottom: '20px',
                    textAlign: 'center',
                    padding: '10px',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                    background: 'linear-gradient(to right, #4a90e2,rgb(57, 25, 198))',  
                    display: 'inline-block',
                    borderRadius: '8px',
                    color: 'white',
                    
                }}
                >
                🌈✨ Login ✨🌈
            </h1>

           
                
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">{success}</p>}

                    <button type="submit">Login</button>

                    <p className="register-text">
                        Don't have an account? <Link to="/register" className="register-link">Register</Link>
                    </p>
                </form>
            </div>
        </Layout>
    );
};

export default LoginForm;
