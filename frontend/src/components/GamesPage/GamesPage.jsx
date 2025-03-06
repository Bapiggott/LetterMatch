// GamesPage.jsx
import React from 'react';
import Layout from '../Layout/Layout';
import './GamesPage.css'

const GamesPage = () => {
    return (
        <Layout>
            <div>

                <section>
                    <h1>Games</h1>
                </section>
                
                <div className='all-games-div'>

                    <div className='game-div letter-match-div'>
                        <div className='game-image-div'>
                            <h2>Letter Match</h2>
                        </div>
                        <div >
                            <div>
                                <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Ratione dolorem consectetur a! Rem corrupti eligendi vero asperiores, error laudantium consequuntur odit repudiandae vitae tempore, eos voluptas fuga at cupiditate quia.</p>
                            </div>
                            <div className='btn-div'>
                                <a className="header-style-btn" href="/lettermatch">Play</a>
                            </div>
                        </div>
                    </div>
                    <div className='game-div word-blitz-div'>
                        <div className='game-image-div'>
                            <h2>Word Blitz</h2>
                        </div>
                        <div >
                            <div>
                                <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Ratione dolorem consectetur a! Rem corrupti eligendi vero asperiores, error laudantium consequuntur odit repudiandae vitae tempore, eos voluptas fuga at cupiditate quia.</p>
                            </div>
                            <div className='btn-div'>
                                <a className="header-style-btn" href="/wordblitz">Play</a>
                            </div>
                        </div>
                    </div>
                    <div className='game-div word-chain-div'>
                        <div className='game-image-div'>
                            <h2>Word Chain</h2>
                        </div>
                        <div >
                            <div>
                                <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Ratione dolorem consectetur a! Rem corrupti eligendi vero asperiores, error laudantium consequuntur odit repudiandae vitae tempore, eos voluptas fuga at cupiditate quia.</p>
                            </div>
                            <div className='btn-div'>
                                <a className="header-style-btn" href="/wordchain">Play</a>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </Layout>
    );
};

export default GamesPage;
