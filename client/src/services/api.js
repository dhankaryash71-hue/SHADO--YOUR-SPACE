import axios from 'axios';

// When running in the browser, '/api' seamlessly routes via Vite proxy in development
// and Express static serving in single-port production, preventing CORS and IPv4/IPv6 mismatches.
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor to attach token if stored in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shado_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle network errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.friendlyMessage =
        'Unable to connect to backend server. Please verify the SHADO server is running on port 5000.';
    }
    return Promise.reject(error);
  }
);

export default api;
