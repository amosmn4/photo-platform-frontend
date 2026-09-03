// Only place in the frontend that should read import.meta.env directly.
export const config = {
  appName: import.meta.env.VITE_APP_NAME ?? 'PhotoDrop',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
};
