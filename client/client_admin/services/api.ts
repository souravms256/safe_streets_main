import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
    // Try cookie first, then localStorage (admin app might prefer cookies or just match user app)
    // admin usually strictly protected.
    // user app uses localStorage. Let's stick to localStorage for simplicity to match user app auth flow,
    // OR use cookies if Next.js middleware is needed. 
    // Staying with localStorage for client-side rendering consistency with the existing backend.

    const token = typeof window !== 'undefined' ? localStorage.getItem("admin_access_token") : null;

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
            if (typeof window !== 'undefined') {
                localStorage.removeItem("admin_access_token");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
