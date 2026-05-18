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
  ForceChangePasswordRequest,
  ForceChangePasswordResponse,
  UserProfileResponse,
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

  /** GET /users/me (protected — requires JWT) */
  getMe: () =>
    apiClient
      .get<UserProfileResponse>('/users/me')
      .then((r) => ({
        id: r.data.id,
        email: r.data.email,
        role: r.data.roles[0] as any, // mapping from array to single role
        must_change_password: r.data.must_change_password,
      })),

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

  /** POST /auth/force-change-password */
  forceChangePassword: (data: ForceChangePasswordRequest) =>
    apiClient
      .post<ForceChangePasswordResponse>('/auth/force-change-password', data)
      .then((r) => r.data),
};
