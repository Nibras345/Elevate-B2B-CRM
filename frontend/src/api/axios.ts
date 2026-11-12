import axios from 'axios';

// Priority: Vite env variable -> React App env variable -> Live Render Backend URL
const baseURL =
  (import.meta as any).env?.VITE_API_URL ||
  ((globalThis as any).process?.env?.REACT_APP_API_URL) ||
  'https://elevate-b2b-crm.onrender.com';

// Configure global Axios defaults so existing calls to axios automatically inherit the config
axios.defaults.baseURL = baseURL;
axios.defaults.withCredentials = true;

// Automatically inject Authorization header if token exists (resilient fallback for cross-domain cookie blocks)
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexcrm_jwt_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Create and export a dedicated, strongly-typed Axios instance
export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexcrm_jwt_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

