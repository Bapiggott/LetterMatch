import React, { useState } from "react";
import './RegisterForm.css';
import Layout from "../Layout/Layout";
import { Link } from "react-router-dom"; // Ensures routing is handled properly

const RegisterForm = () => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
    const isValidPassword = (password) => /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!isValidEmail(email)) {
            setError('Invalid email'); return;
        }
        if (!isValidPassword(password)) {
            setError('Password must contain at least 8 characters, one uppercase, one lowercase, one number'); return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match'); return;
        }

        try {
            const response = await fetch('http://localhost:5000/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to register');
            }

            setSuccess('Registration successful! Redirecting to login...');
            setError('');
            setUsername('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');

            // Redirect to login after a delay
            setTimeout(() => window.location.href = "/login", 2000);

        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <Layout>
            <div className="register-form">
            <h1
                style={{
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    marginBottom: '20px',
                    textAlign: 'center',
                    padding: '5px',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                    background: 'linear-gradient(to right,rgb(7, 86, 177), #7519C6)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent', 
                    backgroundClip: 'text', 
                    color: 'transparent', 
                    display: 'inline-block',
                }}
                >
                Register
            </h1>

                
               
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
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
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    
                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">{success}</p>}

                    <button type="submit">Register</button>

                    <p className="login-text">
                        Already have an account? <Link to="/login" className="login-link">Login</Link>
                    </p>
                </form>
            </div>
        </Layout>
    );
};

export default RegisterForm;
