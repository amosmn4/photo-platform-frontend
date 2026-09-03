import { config } from '../config';

export class ApiClientError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

// The access token is short-lived (15min by default — see JWT_ACCESS_TTL) so
// any session left open longer than that needs a silent refresh, not a hard
// failure. Concurrent 401s share one in-flight refresh instead of each
// firing their own.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!res.ok) return false;
        const body = await res.json().catch(() => null);
        if (!body?.accessToken) return false;
        setAccessToken(body.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Every network call in the app goes through this function. It:
 *  - attaches the JWT if we have one
 *  - always sends cookies (refresh token) for same-origin/CORS-credentialed calls
 *  - on a 401, silently refreshes the access token (via the httpOnly refresh
 *    cookie) and retries once before giving up — otherwise a long-open tab
 *    starts failing every request the moment the access token expires
 *  - normalizes error responses into ApiClientError
 *  - JSON-parses only when there's a JSON body (204s, redirects to signed
 *    URLs, etc. are common in this app)
 */
async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !isRetry && path !== '/auth/refresh') {
    if (await tryRefresh()) return request<T>(path, init, true);
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson ? body?.error?.message ?? 'Request failed' : 'Request failed';
    throw new ApiClientError(res.status, message, isJson ? body?.error?.details : undefined);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};

/**
 * Direct-to-storage upload — deliberately bypasses `api`/the app server
 * entirely (product doc: originals never transit the backend). Reports
 * progress via XHR since fetch() doesn't expose upload progress events.
 */
export function putFileToPresignedUrl(
  url: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}
