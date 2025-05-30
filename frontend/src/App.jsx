import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginFormPage/LoginForm';
import RegisterForm from './components/RegisterFormPage/RegisterForm';
import LetterMatchPage from './components/LetterMatchPage/LetterMatch';
import WordBlitzPage from './components/WordBlitzPage/WordBlitz';
import HomePage from './components/HomePage/HomePage';
import WordChainPage from './components/WordChainPage/WordChain';
import FriendsPage from './components/FriendsPage/Friends';
import ProfilePage from './components/ProfilePage/Profile'
import AboutPage from './components/AboutPage/AboutPage';
import GamesPage from './components/GamesPage/GamesPage';
import PrivateRoute from './PrivateRoute';
import SettingsPage from './components/SettingsPage/SettingsPage';
import { ContextProvider } from './ContextProvider';
import 'boxicons'







const App = () => {
    return (
        <ContextProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginForm />} />
                    <Route path="/" element={<RegisterForm />} />
                    <Route path="/register" element={<RegisterForm/>} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/lettermatch" element={<LetterMatchPage />} />
                    <Route path="/wordblitz" element={<WordBlitzPage />} />
                    <Route path="/wordchain" element={<WordChainPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/games" element={<GamesPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route element={<PrivateRoute />}>
                        <Route path="/Friends" element={<FriendsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                    <Route path="*" element={<div>404 Not Found</div>} />
                </Routes>
            </Router>
        </ContextProvider>
    );
};

export default App;