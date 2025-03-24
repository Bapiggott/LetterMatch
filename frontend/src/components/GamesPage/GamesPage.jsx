import React from 'react';
import Layout from '../Layout/Layout';
import './GamesPage.css';




const GamesPage = () => {
    return (
        <Layout>
            <div>

                <section>
                    <h1>Games</h1>
                </section>
                
                <div className="all-games-div">

                    {/* Game 1 - Letter Match */}
                    <div className="flip-card">
                        <div className="flip-card-inner">
                            <div className="flip-card-front">
                                <h1>Letter Match</h1>
                                <img src="/images/letter-match.jpg" alt="Letter Match" />
                                </div>
                                <div className="flip-card-back">
                                    <h1>Instructions</h1>
                                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ipsa totam consectetur...</p>
                                    <div className="btn-div">
                                        <a className="header-style-btn" href="/lettermatch">Play</a>
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
                                    <h1>Instructions</h1>
                                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ipsa totam consectetur...</p>
                                    <div className="btn-div">
                                        <a className="header-style-btn" href="/wordblitz">Play</a>
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
                                    <h1>Instructions</h1>
                                    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ipsa totam consectetur...</p>
                                    <div className="btn-div">
                                        <a className="header-style-btn" href="/wordchain">Play</a>
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
