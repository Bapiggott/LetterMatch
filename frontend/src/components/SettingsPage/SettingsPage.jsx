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
                    <label>
                        <input type="radio" value="ocean" name="color-theme" checked={colorTheme === "ocean"} onChange={() => changeColorTheme("ocean")}/>
                        Ocean
                    </label>
                    <label>
                        <input type="radio" value="desert" name="color-theme" checked={colorTheme === "desert"} onChange={() => changeColorTheme("desert")}/>
                        Desert
                    </label>
                    <label>
                        <input type="radio" value="arctic" name="color-theme" checked={colorTheme === "arctic"} onChange={() => changeColorTheme("arctic")}/>
                        Arctic
                    </label>
                    <label>
                        <input type="radio" value="fire" name="color-theme" checked={colorTheme === "fire"} onChange={() => changeColorTheme("fire")}/>
                        Fire
                    </label>
                    <label>
                        <input type="radio" value="space" name="color-theme" checked={colorTheme === "space"} onChange={() => changeColorTheme("space")}/>
                        Space
                    </label>
                    <label>
                        <input type="radio" value="darkmode" name="color-theme" checked={colorTheme === "darkmode"} onChange={() => changeColorTheme("darkmode")}/>
                        DarkMode
                    </label>
                    {/* <label>
                        <input type="radio" value="lightmode" name="color-theme" checked={colorTheme === "lightmode"} onChange={() => changeColorTheme("lightmode")}/>
                        LightMode
                    </label>*/}
                </div>
            </div>
        </Layout>
    );
};

export default SettingsPage;
