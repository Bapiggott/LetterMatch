import { API_URL } from './config';

export const getToken = () => localStorage.getItem("token")

export const setToken = (token) => localStorage.setItem("token", token)

export const removeToken = () => localStorage.removeItem("token")

export const getUsername = () => localStorage.getItem("username")

export const setUsername = (username) => localStorage.setItem("username", username)

export const removeUsername = () => localStorage.removeItem("username")