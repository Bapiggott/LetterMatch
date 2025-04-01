import React from 'react';
import Layout from '../Layout/Layout';
import './GamesPage.css';




const GamesPage = () => {
    return (
        <Layout>
            <div>
        
                <section>
                    <h1> 🏁 Wanna be a Letter Master? Select a Challenge! 🏁 </h1>
                </section>
                <div className="all-games-div">
                    {/* Game 1 - Letter Match */}
                    <div className="flip-card">
                   
                        <div className="flip-card-inner">
                            <div className="flip-card-front">
                                <h1>Letter Match</h1>
                            </div>
                            <div className="flip-card-back small-card">
                                <h2>Can you Beat the Clock? ⏳</h2>
                                <p>Can you name a:</p>
                                <ul className="compact-list">
                                    <li>✅ Person</li>
                                    <li>✅ City or Country</li>
                                    <li>✅ Animal</li>
                                    <li>✅ Thing</li>
                                    <li>✅ Food</li>
                                </ul>
                                <p>...ALL starting with the same letter? 🔠</p>
                                <p className="small-text"> Both Single Player and Multiplayer Modes</p>
                                <div className="btn-div">
                                    <a className="header-style-btn play-btn" href="/lettermatch">🎮 Play</a>
                                </div>
                            </div>
                        </div>
                    </div>
                
       
                    
                    {/* Game 2 - Word Blitz */}
                    <div className="flip-card">
                        <div className="flip-card-inner">
                            <div className="flip-card-front">
                                <h1>Word Blitz</h1>
                                <img src="word-blitz.jpg" />
                                </div>
                                <div className="flip-card-back">
                                <h2>Customize your OWN Letter Match!</h2>
                                <p>Here, users can make custom categories and answers like</p>
                                <ul className="compact-list">
                                    <li>✅ Football Players</li>
                                    <li>✅ Musicians</li>
                                    <li>✅ Books</li>
                                    <li>✅ Brands</li>
                                    <li>✅ Colors</li>
                                </ul>
                                <p className="small-text">See how your friends would answer! ⏳</p>
                                <p className="small-text">Multiplayer Only</p>
                                    <div className="btn-div">
                                        <a className="header-style-btn" href="/wordblitz">🎮 Play</a>
                                    </div>
                                </div>
                            </div>
                    </div>
                    {/* Game 3 - Word Chain */}
                    <div className="flip-card">
                        <div className="flip-card-inner">
                            <div className="flip-card-front">
                                    <h1>Word Chain</h1>
                                    <img src="word-chain.jpg" />
                                </div>
                                <div className="flip-card-back">
                                    <h2>Defend your spot with witty wordplay! 🧠 </h2>
                                    <h3>In this Game: </h3>
                                    <ul className="compact-list">
                                        <li>✅ You start with a word or name</li>
                                        <li>✅ Program gets either first, middle, or last letter</li>
                                        <li>✅ Players must enter a name or word starting with that letter</li>
                                
                                </ul>
                                <p className="small-text">Be quick - Time is ticking or face ELIMINATION⏳</p>
                                <p className="small-text">Multiplayer Only</p>
                                    <div className="btn-div">
                                        <a className="header-style-btn" href="/wordchain">🎮 Play</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
        </Layout>
    );
};

export default GamesPage;