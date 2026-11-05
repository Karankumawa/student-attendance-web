import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('edu_auth_token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('edu_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('edu_auth_token');
    localStorage.removeItem('edu_user');
  }, []);

  // Validate session on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('edu_auth_token');
      if (storedToken) {
        try {
          const res = await axiosClient.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('edu_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          if (err.response?.status === 401) {
            console.warn('Session expired or invalid, logging out:', err.message);
            logout();
          } else {
            console.warn('Backend server verification unreachable, maintaining cached session:', err.message);
          }
        }
      }
      setLoading(false);
    };

    verifyToken();

    // Listen for 401 unauthorized events emitted from axiosClient
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = async (email, password, role) => {
    try {
      const payload = { email, password };
      if (role) payload.role = role;
      const response = await axiosClient.post('/auth/login', payload);
      if (response.data.success) {
        const { token: receivedToken, user: receivedUser } = response.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('edu_auth_token', receivedToken);
        localStorage.setItem('edu_user', JSON.stringify(receivedUser));
        return { success: true, role: receivedUser.role };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'An error occurred during authentication';
      return { success: false, message };
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
