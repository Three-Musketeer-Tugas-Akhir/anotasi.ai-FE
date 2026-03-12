import { apiClient } from '@/core/api/axios-client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserInfo,
} from './types';

/**
 * Auth API service.
 * Integrates with the Go backend auth endpoints.
 */
export const authApi = {
  /** POST /auth/login */
  login: (data: LoginRequest) =>
    apiClient
      .post<LoginResponse>('/auth/login', data)
      .then((r) => r.data),

  /** POST /auth/register */
  register: (data: RegisterRequest) =>
    apiClient
      .post<RegisterResponse>('/auth/register', data)
      .then((r) => r.data),

  /** GET /auth/me (protected — requires JWT) */
  getMe: () =>
    apiClient
      .get<{ user: UserInfo }>('/auth/me')
      .then((r) => r.data.user),
};
