import React, { useState, useEffect } from "react";
import Layout from '../Layout/Layout';
import './SettingsPage.css'
import LocalStorageUtils from "../../LocalStorageUtils";


const SettingsPage = () => {
    const [colorTheme, setColorTheme] = useState(LocalStorageUtils.getColorTheme())

    useEffect(() => {
        const savedTheme = LocalStorageUtils.getColorTheme() || "default"
        setColorTheme(savedTheme)
        document.documentElement.setAttribute("data-color-theme", savedTheme);
    }, [])

    const changeColorTheme = (newColorTheme) => {
        setColorTheme(newColorTheme)
        LocalStorageUtils.setColorTheme(newColorTheme)
        document.documentElement.setAttribute("data-color-theme", newColorTheme);
    }


    return (
        <Layout>
            <div>
                <h1>Settings</h1>
                <div>
                    <h2>Color Theme</h2>
                    <label>
                        <input type="radio" value="default" name="color-theme" checked={colorTheme === "default"} onChange={() => changeColorTheme("default")}/>
                        Default
                    </label>
                    <label>
                        <input type="radio" value="jungle" name="color-theme" checked={colorTheme === "jungle"} onChange={() => changeColorTheme("jungle")}/>
                        Jungle
                    </label>
                </div>
            </div>
        </Layout>
    );
};

export default SettingsPage;
