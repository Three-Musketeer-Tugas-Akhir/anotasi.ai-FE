/**
 * Shared API types used across all feature modules.
 */

/** Standard API success response wrapper */
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

/** Standard API error shape (from Go backend) */
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
