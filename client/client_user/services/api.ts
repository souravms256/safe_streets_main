import axios from "axios";
import { emitAuthChange } from "./appShell";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "https://safe-streets-backend.onrender.com",
    timeout: 30000, // 30 s for regular requests
    headers: {
        "Content-Type": "application/json",
    },
});

/** Longer timeout for multipart uploads + AI inference (Render free-tier cold start). */
export const UPLOAD_TIMEOUT_MS = 90_000; // 90 s

// Add token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            emitAuthChange();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;
