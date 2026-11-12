import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Priority: Explicit env variable -> Localhost dev server (5000) -> Live Render Backend URL
const baseURL =
  (import.meta as any).env?.VITE_API_URL ||
  ((globalThis as any).process?.env?.REACT_APP_API_URL) ||
  (isLocalhost ? 'http://localhost:5000' : 'https://elevate-b2b-crm.onrender.com');

// Configure global Axios defaults so existing calls to axios automatically inherit the config
axios.defaults.baseURL = baseURL;
axios.defaults.withCredentials = true;

// Pre-initialize Authorization header from localStorage immediately if present
const savedToken = typeof window !== 'undefined' ? localStorage.getItem('nexcrm_jwt_token') : null;
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

// Concurrency-safe token refresh queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Attach request & response interceptors for silent token refresh
 */
const attachAuthInterceptors = (instance: AxiosInstance) => {
  // Request Interceptor: Automatically inject Authorization header if token exists
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('nexcrm_jwt_token');
    if (token) {
      if (typeof (config.headers as any)?.set === 'function') {
        (config.headers as any).set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        (config.headers as any)['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Response Interceptor: Catch 401, pause failed requests, silent refresh, and retry
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

      if (!originalRequest || !error.response) {
        return Promise.reject(error);
      }

      // Check if error is 401 Unauthorized
      if (error.response.status === 401) {
        const requestUrl = originalRequest.url || '';

        // Prevent infinite loop if the 401 is from login or refresh endpoints
        if (
          requestUrl.includes('/api/auth/refresh') ||
          requestUrl.includes('/api/auth/login') ||
          originalRequest._retry
        ) {
          return Promise.reject(error);
        }

        // If a refresh is already in progress, pause and queue this request
        if (isRefreshing) {
          return new Promise<string | null>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newAccessToken) => {
              if (newAccessToken && originalRequest.headers) {
                if (typeof (originalRequest.headers as any)?.set === 'function') {
                  (originalRequest.headers as any).set('Authorization', `Bearer ${newAccessToken}`);
                } else {
                  (originalRequest.headers as any)['Authorization'] = `Bearer ${newAccessToken}`;
                }
              }
              return instance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Silent POST request to /api/auth/refresh (uses HttpOnly cookie or body fallback)
          const savedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('nexcrm_refresh_token') : null;
          const refreshRes = await axios.post(
            `${baseURL.replace(/\/+$/, '')}/api/auth/refresh`,
            { refreshToken: savedRefreshToken },
            { withCredentials: true }
          );

          const newAccessToken =
            refreshRes.data?.accessToken ||
            refreshRes.data?.token;

          if (newAccessToken) {
            localStorage.setItem('nexcrm_jwt_token', newAccessToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            if (originalRequest.headers) {
              if (typeof (originalRequest.headers as any)?.set === 'function') {
                (originalRequest.headers as any).set('Authorization', `Bearer ${newAccessToken}`);
              } else {
                (originalRequest.headers as any)['Authorization'] = `Bearer ${newAccessToken}`;
              }
            }
          }

          processQueue(null, newAccessToken);
          return instance(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('nexcrm_jwt_token');
          localStorage.removeItem('nexcrm_refresh_token');
          localStorage.removeItem('nexcrm_user');
          localStorage.removeItem('nexcrm_tenant');
          delete axios.defaults.headers.common['Authorization'];
          delete api.defaults.headers.common['Authorization'];

          // If refresh token also expired/revoked, redirect to login
          if (
            typeof window !== 'undefined' &&
            !window.location.pathname.includes('/login') &&
            !window.location.pathname.includes('/register') &&
            !window.location.pathname.includes('/invite')
          ) {
            window.location.href = '/login';
          }

          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};

// Create and export a dedicated, strongly-typed Axios instance
export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach interceptors to both default axios and api instance
attachAuthInterceptors(axios as unknown as AxiosInstance);
attachAuthInterceptors(api);

export default api;

