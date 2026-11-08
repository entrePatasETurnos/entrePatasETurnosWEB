import "server-only";

/**
 * The one place this site talks to entrePatasETurnosAPI.
 *
 * It runs only on the server ("server-only" makes importing it from a Client Component a build
 * error). The browser never calls the API directly and never sees an access token: that is the
 * "backend for frontend" pattern, and it also means the API needs no CORS setup for this site.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    /** The API's machine-readable `error` field, e.g. `insufficient_capacity`. */
    public readonly code: string | undefined,
    public readonly body: unknown,
  ) {
    super(`API answered ${status}${code ? ` ${code}` : ""}`);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("API_BASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  return url.replace(/\/+$/, "");
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Our own access token, sent as a bearer token. */
  token?: string;
  body?: unknown;
  /** Extra headers, e.g. the browser's User-Agent so the API can name the session's device. */
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", token, body, headers = {} } = options;

  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // Everything here is per-user and must be fresh; never cache API answers.
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const code =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : undefined;
    throw new ApiError(response.status, code, data);
  }

  return data as T;
}
