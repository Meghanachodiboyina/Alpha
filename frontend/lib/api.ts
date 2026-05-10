import axios from 'axios';
import { setCookie, deleteCookie, getCookie } from 'cookies-next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token
api.interceptors.request.use((config) => {
  const token = getCookie('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      deleteCookie('auth_token');
      localStorage.removeItem('user');
      
      // Only redirect to landing if NOT already on login or register page
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/register') {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
