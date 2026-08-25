/**
 * Single place the frontend reads import.meta.env from. Nothing else in the
 * codebase should touch import.meta.env directly — mirrors the backend's
 * config/env.ts pattern so "the app name lives in .env" holds everywhere.
 */
export const config = {
  appName: import.meta.env.VITE_APP_NAME ?? 'PhotoDrop',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
};
