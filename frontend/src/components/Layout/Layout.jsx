// Layout.jsx
import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Chat from '../Chat/Chat';
import LocalStorageUtils from '../../LocalStorageUtils';

const Layout = ({children}) => {
    return (
        <>
            <Header/>

            <main> 
                {children} 
                {LocalStorageUtils.getToken() && (
                    <Chat/>
                )}
            </main>

            <Footer/>
        </>
    );
};

export default Layout;
