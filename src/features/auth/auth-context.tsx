'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { UserInfo, LoginRequest, RegisterRequest } from './types';
import { authApi } from './auth-api';

// ── Constants ──────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';

// ── Context shape ──────────────────────────────────────────────────

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    // Redirect to login purely client-side
    router.push('/login');
  }, [router]);

  // Schedule auto logout based on JWT expiration
  const scheduleLogout = useCallback((tokenStr: string) => {
    const payload = parseJwt(tokenStr);
    if (payload?.exp) {
      const expiresInMs = payload.exp * 1000 - Date.now();
      if (expiresInMs <= 0) {
        performLogout();
      } else {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        const maxTimeout = 2147483647; // 24.8 days (setTimeout limit)
        logoutTimerRef.current = setTimeout(() => {
          performLogout();
        }, Math.min(expiresInMs, maxTimeout));
      }
    }
  }, [performLogout]);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    // Checking if token is already expired before even calling API
    const payload = parseJwt(stored);
    if (payload?.exp && payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      setIsLoading(false);
      return;
    }

    setToken(stored);
    scheduleLogout(stored);

    // Validate token by fetching current user
    authApi
      .getMe()
      .then((userInfo) => {
        setUser(userInfo);
      })
      .catch(() => {
        // Token is invalid/expired on the server — clear
        performLogout();
      })
      .finally(() => {
        setIsLoading(false);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const login = useCallback(async (data: LoginRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
      scheduleLogout(res.token);
      router.push('/');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Login gagal. Periksa username dan password.');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router, scheduleLogout]);

  const register = useCallback(async (data: RegisterRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
      scheduleLogout(res.token);
      router.push('/');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Registrasi gagal. Coba lagi.');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router, scheduleLogout]);

  const logout = useCallback(() => {
    performLogout();
  }, [performLogout]);

  const clearError = useCallback(() => setError(null), []);

  const isAuthenticated = !!user && !!token;

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const publicPaths = ['/login', '/register'];
    const isPublic = publicPaths.includes(pathname);

    if (!isAuthenticated && !isPublic) {
      router.push('/login');
    } else if (isAuthenticated && isPublic) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    [user, token, isAuthenticated, isLoading, login, register, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

// ── Utils ──────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const resp = (err as { response?: { data?: { error?: string } } }).response;
    if (resp?.data?.error) return resp.data.error;
  }
  return fallback;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}
