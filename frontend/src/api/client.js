import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
let refreshRequest = null;

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Auto Refresh Token if expired
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const authEndpoint = /\/accounts\/(login|logout|token\/refresh)\//.test(originalRequest?.url || '');
    if (error.response?.status === 401 && originalRequest && !authEndpoint && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          if (!refreshRequest) {
            refreshRequest = axios.post(`${API_BASE_URL}/accounts/token/refresh/`, { refresh: refreshToken })
              .then((res) => {
                // A response arriving after logout must not recreate the old session.
                if (localStorage.getItem('refresh_token') !== refreshToken) throw new Error('Session changed');
                localStorage.setItem('access_token', res.data.access);
                if (res.data.refresh) localStorage.setItem('refresh_token', res.data.refresh);
                return res.data.access;
              })
              .finally(() => { refreshRequest = null; });
          }
          const newAccessToken = await refreshRequest;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        } catch (refreshErr) {
          if (refreshErr.response?.status === 401 || refreshErr.response?.status === 400) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_info');
            window.dispatchEvent(new Event('session-expired'));
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
