import axios from "axios";

// Use relative API path by default so requests work from other devices on LAN.
// You can override with VITE_API_BASE_URL when needed.
const normalizeBaseUrl = (value) => {
  if (!value) {
    return "/api";
  }

  const trimmed = String(value).trim().replace(/\/$/, "");

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }

  return trimmed;
};

const apiBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || "/api",
);

// Create axios instance with base URL
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
