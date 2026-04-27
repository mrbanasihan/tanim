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

const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_ADMIN_API_BASE_URL || "/api"),
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
