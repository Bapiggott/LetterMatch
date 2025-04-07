import React, { useState, useEffect } from "react";
import Layout from '../Layout/Layout';
import './SettingsPage.css';
import LocalStorageUtils from "../../LocalStorageUtils";

const SettingsPage = () => {
    const [colorTheme, setColorTheme] = useState(LocalStorageUtils.getColorTheme());

    useEffect(() => {
        const savedTheme = LocalStorageUtils.getColorTheme() || "default";
        setColorTheme(savedTheme);
        document.documentElement.setAttribute("data-color-theme", savedTheme);
    }, []);

    const changeColorTheme = (newColorTheme) => {
        setColorTheme(newColorTheme);
        LocalStorageUtils.setColorTheme(newColorTheme);
        document.documentElement.setAttribute("data-color-theme", newColorTheme);
    };

    const themes = [
        { value: "default", label: "Default" },
        { value: "jungle", label: "Jungle" },
        { value: "ocean", label: "Ocean" },
        { value: "desert", label: "Desert" },
        { value: "arctic", label: "Arctic" },
        { value: "fire", label: "Fire" },
        { value: "space", label: "Space" },
        { value: "darkmode", label: "Dark Mode" },
        // { value: "lightmode", label: "Light Mode" },
        // { value: "puzzle", label: "Puzzle" }
    ];

    return (
        <Layout>
            <div className="settings">
                <h1>Settings</h1>
                <div className="theme-div">
                    <h2>Color Theme</h2>
                    <select 
                        value={colorTheme} 
                        onChange={(e) => changeColorTheme(e.target.value)}
                    >
                        {themes.map((theme) => (
                            <option key={theme.value} value={theme.value}>
                                {theme.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </Layout>
    );
};

export default SettingsPage;
