const TOKEN_STORAGE_NAME = "token"
const USERNAME_STORAGE_NAME = "username"
const COLOR_THEME_STORAGE_NAME = "color-theme"

// Token

export const getToken = () => localStorage.getItem(TOKEN_STORAGE_NAME)

export const setToken = (token) => localStorage.setItem(TOKEN_STORAGE_NAME, token)

export const removeToken = () => localStorage.removeItem(TOKEN_STORAGE_NAME)

// Username

export const getUsername = () => localStorage.getItem(USERNAME_STORAGE_NAME)

export const setUsername = (username) => localStorage.setItem(USERNAME_STORAGE_NAME, username)

export const removeUsername = () => localStorage.removeItem(USERNAME_STORAGE_NAME)

// Color Theme

export const getColorTheme = () => localStorage.getItem(COLOR_THEME_STORAGE_NAME)

export const setColorTheme = (colorTheme) => localStorage.setItem(COLOR_THEME_STORAGE_NAME, colorTheme)

export const removeColorTheme = () => localStorage.removeItem(COLOR_THEME_STORAGE_NAME)