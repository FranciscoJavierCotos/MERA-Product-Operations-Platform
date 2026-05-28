import "server-only";
import { createClient } from "@/lib/supabase/server";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

type Query = Record<string, string | number | boolean | undefined | null>;

function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function authHeader(): Promise<Record<string, string>> {
  const sb = await createClient();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  opts: { query?: Query; body?: unknown; cache?: RequestCache; revalidate?: number } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(await authHeader()),
  };

  const fetchInit: RequestInit = {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };

  if (opts.revalidate !== undefined) {
    fetchInit.next = { revalidate: opts.revalidate };
  } else {
    fetchInit.cache = opts.cache ?? "no-store";
  }

  const res = await fetch(`${API_URL}${path}${buildQuery(opts.query)}`, fetchInit);

  if (!res.ok) {
    let bodyJson: unknown = null;
    try {
      bodyJson = await res.json();
    } catch {
      // ignore
    }
    const message =
      bodyJson && typeof bodyJson === "object" && "message" in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : `API ${method} ${path} failed: ${res.status}`;
    throw new ApiError(res.status, message, bodyJson);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  getRevalidated: <T>(path: string, revalidate: number, query?: Query) =>
    request<T>("GET", path, { query, revalidate }),
  post: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>("POST", path, { body, query }),
  put: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>("PUT", path, { body, query }),
  patch: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>("PATCH", path, { body, query }),
  del: <T>(path: string, query?: Query) => request<T>("DELETE", path, { query }),
};
