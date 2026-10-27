'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiClient,
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
  getStoredUser,
  setStoredUser,
} from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check initial user and token
    const initialUser = getStoredUser();
    const { accessToken } = getStoredTokens();

    if (accessToken) {
      if (initialUser) {
        setUser(initialUser);
      }
      // Revalidate profile with backend
      apiClient('/auth/me')
        .then((res) => {
          if (res.data) {
            setUser(res.data);
            setStoredUser(res.data);
          }
        })
        .catch(() => {
          // If token invalid and can't refresh, clear state
          clearStoredTokens();
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: { email, password },
      requiresAuth: false,
    });

    if (res.data) {
      const { user: authUser, tokens } = res.data;
      setStoredTokens(tokens);
      setStoredUser(authUser);
      setUser(authUser);
      return authUser;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore server logout errors
    } finally {
      clearStoredTokens();
      setUser(null);
      router.push('/login');
    }
  };

  const updateUserState = (updatedFields) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedFields };
      setStoredUser(next);
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
