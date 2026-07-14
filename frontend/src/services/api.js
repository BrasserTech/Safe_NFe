import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("safe-nfe-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("safe-nfe-token");
      localStorage.removeItem("safe-nfe-user");
      if (window.location.pathname.startsWith("/app")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
