// Client API unique : gestion du token, erreurs typées, intercepteurs.
// Le frontend ne détient aucune logique métier : il relaie les erreurs de l'API.

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

const TOKEN_KEY = 'lendhome.access_token';
const TOKEN_EXPIRY_KEY = 'lendhome.access_token_expires_at';

export function getAccessToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const expiresAt = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiresAt && Date.now() >= Number(expiresAt)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }

    if (!expiresAt && token.startsWith('mock-')) {
      const mockExpiry = Number(token.split('-').at(-1));
      if (mockExpiry && Date.now() >= mockExpiry) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
    }

    return token;
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null, expiresAt?: string) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      if (expiresAt) {
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(new Date(expiresAt).getTime()));
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  } catch {
    /* stockage indisponible */
  }
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  get isConflict() {
    return this.status === 409;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isValidation() {
    return this.status === 422;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  // En mode mock, MSW intercepte les requêtes same-origin.
  return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`;
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion.');
  }

  if (res.status === 401) {
    setAccessToken(null);
    onUnauthorized?.();
    throw new ApiError(401, 'Session expirée. Veuillez vous reconnecter.');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let payload: unknown = undefined;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const message =
      (payload as { message?: string; error?: string })?.message ??
      (payload as { error?: string })?.error ??
      `Erreur ${res.status}`;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

// Helpers typés
export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    apiFetch<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
