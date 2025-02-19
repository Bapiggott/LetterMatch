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
                
                <div className='games-div'>

                    <a href="/lettermatch">
                        <section className='letter-match-section'>
                            <h2>Letter Match</h2>
                        </section>
                    </a>    
                   
                    <a href="/wordblitz">
                        <section className='word-blitz-section'>
                            <h2>Word Blitz</h2>
                        </section>
                    </a>

                    <a href="/wordchain">
                        <section className='word-chain-section'>
                            <h2>Word Chain</h2>
                        </section>
                    </a>

                </div>

            </div>
        </Layout>
    );
};

export default GamesPage;
