import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

const USER_STORAGE_KEY = 'shado_user';
const TOKEN_STORAGE_KEY = 'shado_auth_token';

export const AuthProvider = ({ children }) => {
  // Synchronously restore user from localStorage if both token and user profile exist
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (token && storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (e) {
      console.warn('Failed to parse cached session:', e);
    }
    return null;
  });

  // Only block with full-screen spinner if a token exists but user profile is not cached yet
  const [loading, setLoading] = useState(() => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      return !!(token && !storedUser);
    } catch {
      return false;
    }
  });

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    // If no token exists at all and no cached user, ensure clean state
    if (!token) {
      setUser(null);
      try {
        localStorage.removeItem(USER_STORAGE_KEY);
      } catch {}
      setLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      if (data && data.success && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        } catch {}
      } else {
        // Explicit invalid session from server
        setUser(null);
        try {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {}
      }
    } catch (err) {
      const status = err.response?.status;
      // ONLY clear session if server explicitly returns 401 (Unauthorized) or 403 (Forbidden)
      if (status === 401 || status === 403) {
        console.warn('Session expired or unauthorized (401/403). Clearing session.');
        setUser(null);
        try {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {}
      } else {
        // In case of transient network error, DB wake-up, or 500 error, preserve the cached session
        console.warn('Transient network/server error during auth check. Preserving cached session.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (identifier, password) => {
    const data = await authService.login(identifier, password);
    if (data.success && data.user) {
      if (data.token) {
        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        } catch {}
      }
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      } catch {}
      setUser(data.user);
      return data;
    }
    throw new Error(data.message || 'Login failed');
  };

  const register = async (formData) => {
    const data = await authService.register(formData);
    if (data.success && data.user) {
      if (data.token) {
        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        } catch {}
      }
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      } catch {}
      setUser(data.user);
      return data;
    }
    throw new Error(data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      } catch {}
      setUser(null);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateUser,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
