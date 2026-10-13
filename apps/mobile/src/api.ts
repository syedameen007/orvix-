const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : "/api");

export interface ApiState {
  token: string | null;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

/** Lets the app sign the user out automatically when the server says the session is no longer valid. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

interface ErrorPayload {
  error?: string;
  message?: string;
  details?: { fieldErrors?: Record<string, string[] | undefined> };
}

function readableError(payload: ErrorPayload, status: number) {
  const fieldErrors = payload.details?.fieldErrors;
  const firstField = fieldErrors ? Object.values(fieldErrors).find((messages) => messages?.length)?.[0] : undefined;
  if (firstField) return firstField;
  if (status === 429) return payload.error ?? "Too many requests. Please slow down and try again shortly.";
  if (status >= 500) return "Our servers hit a problem. Please try again in a moment.";
  return payload.error ?? payload.message ?? `Request failed (${status})`;
}

export async function apiRequest<T>(state: ApiState, path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...(options.headers ?? {})
      }
    });
  } catch {
    throw new ApiRequestError("You appear to be offline. Check your connection and try again.", 0);
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
  if (!response.ok) {
    // A 401 on an authenticated call means the session expired or was revoked.
    if (response.status === 401 && state.token && !path.startsWith("/auth/login")) onUnauthorized?.();
    throw new ApiRequestError(readableError(payload, response.status), response.status);
  }
  return payload as T;
}

export { API_BASE };
