/**
 * Auth module types — mirrors the jbi-service backend.
 */

// ── Roles ──────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'annotator' | 'curator';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  annotator: 'Annotator',
  curator: 'Curator',
};

// ── User ───────────────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  email: string;
  role: UserRole;
}

// ── Login ──────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ── Token Refresh ──────────────────────────────────────────────────

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ── Logout ─────────────────────────────────────────────────────────

export interface LogoutRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  message: string;
}

// ── Forgot Password ───────────────────────────────────────────────

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  retry_after?: number | null;
}

// ── Reset Password ────────────────────────────────────────────────

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

// ── Verify Email ──────────────────────────────────────────────────

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
}

// ── Resend Verification ───────────────────────────────────────────

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
  retry_after?: number | null;
}

// ── Change Password ───────────────────────────────────────────────

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// ── User Profile ──────────────────────────────────────────────────

export interface UpdateProfileRequest {
  email?: string | null;
}

export interface UpdateProfileResponse {
  id: string;
  email: string;
  message: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  roles: string[];
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ── Auth Error ─────────────────────────────────────────────────────

export interface AuthErrorResponse {
  error: string;
  detail: string;
}
