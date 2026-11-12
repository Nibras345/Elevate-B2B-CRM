import axios from 'axios';

// Priority: Vite env variable -> React App env variable -> Live Render Backend URL
const baseURL =
  (import.meta as any).env?.VITE_API_URL ||
  ((globalThis as any).process?.env?.REACT_APP_API_URL) ||
  'https://elevate-b2b-crm.onrender.com';

// Configure global Axios defaults so existing calls to axios automatically inherit the config
axios.defaults.baseURL = baseURL;
axios.defaults.withCredentials = true;

// Create and export a dedicated, strongly-typed Axios instance
export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

