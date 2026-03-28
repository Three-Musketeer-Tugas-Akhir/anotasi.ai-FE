import { apiClient } from '@/core/api/axios-client';
import type {
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  LogoutRequest,
  LogoutResponse,
  UserInfo,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
} from './types';

/**
 * Auth API service.
 * Integrates with the jbi-service backend auth endpoints.
 */
export const authApi = {
  /** POST /auth/login */
  login: (data: LoginRequest) =>
    apiClient
      .post<LoginResponse>('/auth/login', data)
      .then((r) => r.data),

  /** POST /auth/refresh */
  refresh: (data: RefreshRequest) =>
    apiClient
      .post<RefreshResponse>('/auth/refresh', data)
      .then((r) => r.data),

  /** POST /auth/logout */
  logout: (data: LogoutRequest) =>
    apiClient
      .post<LogoutResponse>('/auth/logout', data)
      .then((r) => r.data),

  /** GET /auth/me (protected — requires JWT) */
  getMe: () =>
    apiClient
      .get<UserInfo>('/auth/me')
      .then((r) => r.data),

  /** POST /auth/forgot-password */
  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient
      .post<ForgotPasswordResponse>('/auth/forgot-password', data)
      .then((r) => r.data),

  /** POST /auth/reset-password */
  resetPassword: (data: ResetPasswordRequest) =>
    apiClient
      .post<ResetPasswordResponse>('/auth/reset-password', data)
      .then((r) => r.data),

  /** POST /auth/verify-email */
  verifyEmail: (data: VerifyEmailRequest) =>
    apiClient
      .post<VerifyEmailResponse>('/auth/verify-email', data)
      .then((r) => r.data),

  /** POST /auth/resend-verification */
  resendVerification: (data: ResendVerificationRequest) =>
    apiClient
      .post<ResendVerificationResponse>('/auth/resend-verification', data)
      .then((r) => r.data),
};
