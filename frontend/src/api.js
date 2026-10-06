import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// In production Express serves the client, so the socket lives on the same origin
export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === "production"
    ? window.location.origin
    : "http://localhost:5006");

let onUnauthorized = () => {};

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export const setAuthToken = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = (error.config && error.config.url) || "";
    // A 401 anywhere but the login form means the session is no longer valid
    if (error.response && error.response.status === 401 && !url.includes("/user/login")) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (error, fallback = "Something went wrong") => {
  if (error && error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  if (error && !error.response) return "Can't reach the server. Check your connection.";
  return fallback;
};

export default api;
