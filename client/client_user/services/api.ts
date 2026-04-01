import axios, { AxiosError } from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "https://safe-streets-backend.onrender.com",
    headers: {
        "Content-Type": "application/json",
    },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
    // If sending FormData, let the browser set the Content-Type (including multipart boundaries).
    // Axios may set a default Content-Type; remove it so the correct header is used.
    try {
        if (typeof FormData !== "undefined" && config.data instanceof FormData) {
            if (config.headers) {
                const headers = config.headers as any;

                if (typeof headers.setContentType === "function") {
                    headers.setContentType(undefined);
                }
                if (typeof headers.delete === "function") {
                    headers.delete("Content-Type");
                    headers.delete("content-type");
                } else {
                    delete headers["Content-Type"];
                    delete headers["content-type"];
                }
            }
        }
    } catch (err) {
        // Defensive: if something unexpected happens, continue without crashing.
        // eslint-disable-next-line no-console
        console.warn('[API] Failed to adjust headers for FormData', err);
    }

    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export function getApiErrorMessage(error: unknown): string {
    const axiosError = error as AxiosError<{ detail?: string }>;

    if (axiosError.response?.data?.detail) {
        return axiosError.response.data.detail;
    }

    if (axiosError.code === "ERR_NETWORK" || !axiosError.response) {
        return "Could not reach the SafeStreets server from this device. Please check your internet connection and API URL.";
    }

    return axiosError.message || "Request failed. Please try again.";
}

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const method = error.config?.method?.toUpperCase() || "UNKNOWN";
        const url = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
        console.error("[API] Request failed", {
            method,
            url,
            status: error.response?.status,
            code: error.code,
            message: error.message,
            detail: error.response?.data?.detail,
            correlationId: error.response?.headers?.["x-correlation-id"],
        });

        if (error.response?.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;
