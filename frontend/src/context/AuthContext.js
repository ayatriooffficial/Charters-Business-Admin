import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const setSessionToken = (token) => {
  sessionStorage.setItem('token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const clearSessionToken = () => {
  sessionStorage.removeItem('token');
  delete api.defaults.headers.common.Authorization;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Decode JWT safely
  const decodeJwt = (token) => {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

      const jsonPayload = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  // Fetch current user (admin route first, then candidate route)
  const fetchCurrentUser = async () => {
    try {
      const adminRes = await api.get('/admin/auth/me');
      if (adminRes?.data?.user) {
        setUser(adminRes.data.user);
        setLoading(false);
        return;
      }
    } catch (error) {
      // fall through to local auth/me
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      clearSessionToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial session restore
  useEffect(() => {
    const token = sessionStorage.getItem('token');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded = decodeJwt(token);

      // Invalid or expired token
      if (!decoded || !decoded.exp || decoded.exp * 1000 < Date.now()) {
        clearSessionToken();
        setLoading(false);
        return;
      }

      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchCurrentUser();
    } catch {
      clearSessionToken();
      setLoading(false);
    }
  }, []);

  // Detect server restart (optional safety)
  useEffect(() => {
    const checkServer = async () => {
      try {
        const { data } = await api.get('/health');

        const serverStart = data?.serverStart;
        const prev = sessionStorage.getItem('serverStart');

        if (prev && prev !== serverStart) {
          clearSessionToken();
          setUser(null);
        }

        if (serverStart) {
          sessionStorage.setItem('serverStart', serverStart);
        }
      } catch {
        // ignore
      }
    };

    checkServer();
  }, []);

  // LOGIN
  const login = async (email, password) => {
    // Candidate login first keeps regular users independent from admin-upstream availability.
    let candidateError = null;
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSessionToken(data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      candidateError = error;
      const status = error?.response?.status;
      // Non-auth failures should surface immediately.
      if (![401, 403].includes(status)) {
        throw error;
      }
    }

    // Candidate auth failed -> try admin validation path.
    try {
      const adminRes = await api.post('/admin/auth/login', { email, password });
      if (adminRes?.data?.token && adminRes?.data?.user) {
        setSessionToken(adminRes.data.token);
        setUser(adminRes.data.user);
        return adminRes.data;
      }

      throw candidateError;
    } catch (adminError) {
      const adminStatus = adminError?.response?.status;
      if ([404, 429, 500, 502, 503, 504].includes(adminStatus)) {
        const combinedError = new Error(
          'Candidate credentials are invalid, and admin login validation is currently unavailable. Please try again shortly.'
        );
        combinedError.response = adminError?.response;
        throw combinedError;
      }

      throw adminError;
    }
  };

  // REGISTER
  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);

    setSessionToken(data.token);
    setUser(data.user);

    return data;
  };

  // LOGOUT
  const logout = () => {
    clearSessionToken();
    setUser(null);
  };

  // Update user manually (after profile edit etc.)
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  // Clear token on tab close
  useEffect(() => {
    const handleUnload = () => {
      try {
        sessionStorage.removeItem('token');
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

