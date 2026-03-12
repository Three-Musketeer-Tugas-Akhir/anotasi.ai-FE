/**
 * Auth module types — mirrors the Go backend domain layer.
 */

// ── Roles ──────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'annotator' | 'curator' | 'system';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  annotator: 'Annotator',
  curator: 'Curator',
  system: 'System',
};

// ── User ───────────────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

// ── Login ──────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

// ── Register ───────────────────────────────────────────────────────

export interface RegisterRequest {
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
}

// Register uses the same response shape (auto-login)
export type RegisterResponse = LoginResponse;
