/**
 * Typed environment configuration.
 * All env vars accessed through this single object for type safety and discoverability.
 */
export const env = {
  /** Base URL for the backend API */
  API_URL:
    process.env.NEXT_PUBLIC_USE_PROXY === "true"
      ? "/api/v1" // Use proxy rewrite to avoid CORS
      : process.env.NEXT_PUBLIC_API_URL || "http://152.118.31.36:8000/api/v1",

  /** Current environment */
  NODE_ENV: process.env.NODE_ENV || "development",

  /** Whether we're in development mode */
  isDev: process.env.NODE_ENV === "development",

  /** Whether we're in production mode */
  isProd: process.env.NODE_ENV === "production",
} as const;
