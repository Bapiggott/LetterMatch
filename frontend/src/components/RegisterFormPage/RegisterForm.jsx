import React, { useState } from "react";
import './RegisterForm.css';
import Layout from "../Layout/Layout";

const RegisterForm = () => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('email:', email);
        console.log('password:', password);
        console.log('confirmPassword:', confirmPassword);
    }

    return (

        <Layout>
            
            <div className="register-form">
                <h1>Register</h1>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button type="submit">Register</button>
                </form>
            </div>
        </Layout>
    );
};
export default RegisterForm;