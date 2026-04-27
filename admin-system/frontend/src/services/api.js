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

const isObviousBadAdminApiUrl = (value) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return (
      parsed.hostname.endsWith("supabase.co") ||
      parsed.hostname.includes("pooler.supabase.com") ||
      parsed.hostname.startsWith("db.")
    );
  } catch {
    return false;
  }
};

const getDefaultBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "/api";
  }

  return "https://admin-1-t84v.onrender.com/api";
};

const configuredBaseUrl =
  import.meta.env.VITE_ADMIN_API_BASE_URL || import.meta.env.VITE_API_BASE_URL;
const resolvedBaseUrl =
  configuredBaseUrl && !isObviousBadAdminApiUrl(configuredBaseUrl)
    ? configuredBaseUrl
    : getDefaultBaseUrl();

if (configuredBaseUrl && isObviousBadAdminApiUrl(configuredBaseUrl)) {
  console.warn(
    `Ignoring invalid admin API base URL: ${configuredBaseUrl}. Falling back to ${resolvedBaseUrl}`,
  );
}

const api = axios.create({
  baseURL: normalizeBaseUrl(resolvedBaseUrl),
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
