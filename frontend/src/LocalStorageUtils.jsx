class LocalStorageUtils {
    static TOKEN_STORAGE_NAME = "token"
    static USERNAME_STORAGE_NAME = "username"
    static COLOR_THEME_STORAGE_NAME = "color-theme"

    // Token
    static getToken() {
        return localStorage.getItem(this.TOKEN_STORAGE_NAME)
    }

    static setToken(token) {
        localStorage.setItem(this.TOKEN_STORAGE_NAME, token)
    }

    static removeToken() {
        localStorage.removeItem(this.TOKEN_STORAGE_NAME)
    }

    // Username
    static getUsername() {
        return localStorage.getItem(this.USERNAME_STORAGE_NAME)
    }

    static setUsername(username) {
        localStorage.setItem(this.USERNAME_STORAGE_NAME, username)
    }

    static removeUsername() {
        localStorage.removeItem(this.USERNAME_STORAGE_NAME)
    }

    // Color Theme
    static getColorTheme() {
        return localStorage.getItem(this.COLOR_THEME_STORAGE_NAME)
    }

    static setColorTheme(colorTheme) {
        localStorage.setItem(this.COLOR_THEME_STORAGE_NAME, colorTheme)
    }

    static removeColorTheme() {
        localStorage.removeItem(this.COLOR_THEME_STORAGE_NAME)
    }
}

export default LocalStorageUtils;
