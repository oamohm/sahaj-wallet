export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE = "/api/v1";

type TokenGetter = () => string | null;
type TokenRefresher = () => Promise<string | null>;

let getAccessToken: TokenGetter = () => null;
let refreshAccessToken: TokenRefresher = async () => null;

/** Wired up once from AuthProvider so this module never imports React state directly. */
export function configureApiAuth(getter: TokenGetter, refresher: TokenRefresher): void {
  getAccessToken = getter;
  refreshAccessToken = refresher;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(API_BASE + path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

async function rawRequest<T>(path: string, options: RequestOptions, attemptedRefresh = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !attemptedRefresh && options.auth !== false) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return rawRequest<T>(path, options, true);
      }
    }

    const error = payload?.error;
    throw new ApiError(error?.code ?? "UNKNOWN_ERROR", error?.message ?? "Something went wrong", response.status, error?.details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => rawRequest<T>(path, { method: "GET", query }),
  getPublic: <T>(path: string, query?: RequestOptions["query"]) => rawRequest<T>(path, { method: "GET", query, auth: false }),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    rawRequest<T>(path, { method: "POST", body, auth: opts?.auth }),
  del: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: "DELETE", body }),
};
