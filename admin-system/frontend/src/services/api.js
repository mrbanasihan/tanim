import axios from "axios";

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

const getDefaultBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "/api";
  }

  return "https://admin-1-t84v.onrender.com/api";
};

const api = axios.create({
  baseURL: normalizeBaseUrl(
    import.meta.env.VITE_ADMIN_API_BASE_URL || getDefaultBaseUrl(),
  ),
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
