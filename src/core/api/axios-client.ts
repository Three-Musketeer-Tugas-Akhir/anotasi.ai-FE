import axios from 'axios';
import { env } from '@/core/config/env';

/**
 * Central Axios instance.
 * All API calls should go through this client for consistent
 * base URL, headers, interceptors, and error handling.
 */
export const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ──────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Attach JWT token from localStorage for authenticated requests
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor ─────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize error shape for consistent handling across the app
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred';

      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
    }
    return Promise.reject(error);
  },
);
