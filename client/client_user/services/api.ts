import axios from 'axios';
import Cookies from 'js-cookie';

// Create an Axios instance
const api = axios.create({
    baseURL: 'http://localhost:8000', // Adjust if your server runs on a different port
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration (401)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = Cookies.get('refresh_token');
                if (!refreshToken) {
                    // No refresh token, redirect to login or handle logout
                    // window.location.href = '/login'; 
                    return Promise.reject(error);
                }

                // Call the refresh endpoint (ensure this matches your server route)
                const response = await axios.post('http://localhost:8000/auth/refresh', null, {
                    params: { refresh_token: refreshToken }
                });

                const { access_token } = response.data;

                // Update the cookie
                Cookies.set('access_token', access_token);

                // Update the header and retry the original request
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                Cookies.remove('access_token');
                Cookies.remove('refresh_token');
                // window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
