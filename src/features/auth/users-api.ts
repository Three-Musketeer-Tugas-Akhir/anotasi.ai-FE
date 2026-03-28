import { apiClient } from '@/core/api/axios-client';
import type {
  UserProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from './types';

/**
 * Users API service.
 * Integrates with /api/v1/users/* endpoints.
 */
export const usersApi = {
  /** GET /users/me */
  getProfile: () =>
    apiClient
      .get<UserProfileResponse>('/users/me')
      .then((r) => r.data),

  /** PATCH /users/me */
  updateProfile: (data: UpdateProfileRequest) =>
    apiClient
      .patch<UpdateProfileResponse>('/users/me', data)
      .then((r) => r.data),

  /** POST /users/me/password */
  changePassword: (data: ChangePasswordRequest) =>
    apiClient
      .post<ChangePasswordResponse>('/users/me/password', data)
      .then((r) => r.data),
};
