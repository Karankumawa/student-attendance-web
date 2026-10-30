import axios from 'axios';

// Automatically normalize base API URL
const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || '/api';
  // Remove any trailing slashes
  url = url.trim().replace(/\/+$/, '');
  
  // If it's a full remote URL (http:// or https://) and doesn't end with /api, append /api
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

// Base API Client
const axiosClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000, // Render free tier can take up to 20s to wake up on first call
});

// Request Interceptor: Attach JWT Token from localStorage
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('edu_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Global 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired or invalid credentials
      localStorage.removeItem('edu_auth_token');
      localStorage.removeItem('edu_user');
      // Dispatch custom event so AuthContext updates reactively
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
