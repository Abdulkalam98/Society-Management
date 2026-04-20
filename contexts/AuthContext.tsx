'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  authApi,
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from '@/lib/api';
import type { User, Flat } from '@/types';

// ─── Cookie Helpers (for middleware) ─────────────────────────────────────────
// The middleware reads lightweight cookies to gate routes server-side.
// These cookies carry NO sensitive data — only role/presence flags.

function setSessionCookies(role: string) {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `auth_session=1; path=/; max-age=${maxAge}; SameSite=Strict`;
  document.cookie = `user_role=${role}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

function clearSessionCookies() {
  document.cookie = 'auth_session=; path=/; max-age=0';
  document.cookie = 'user_role=; path=/; max-age=0';
}

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  flat: Flat | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [flat, setFlat] = useState<Flat | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session from persisted refreshToken
  const refresh = useCallback(async () => {
    const savedRefreshToken = getRefreshToken();
    const currentToken = getAccessToken();

    // Need either an access token or a refresh token to restore the session
    if (!savedRefreshToken && !currentToken) {
      setIsLoading(false);
      return;
    }

    try {
      const { user: me, flat: myFlat } = await authApi.me();
      setUser(me);
      setFlat(myFlat);
      setSessionCookies(me.role);
    } catch {
      clearTokens();
      clearSessionCookies();
      setUser(null);
      setFlat(undefined);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    setSessionCookies(data.user.role);

    // Fetch flat info if homeowner
    if (data.user.role === 'HOMEOWNER') {
      try {
        const { flat: myFlat } = await authApi.me();
        setFlat(myFlat);
      } catch {
        // non-fatal
      }
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } finally {
      clearTokens();
      clearSessionCookies();
      setUser(null);
      setFlat(undefined);
      router.push('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        flat,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
