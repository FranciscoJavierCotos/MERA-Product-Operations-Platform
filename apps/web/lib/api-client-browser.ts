"use client";

import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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
  const sb = createClient();
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
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  const res = await fetch(`${API_URL}${path}${buildQuery(opts.query)}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

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

export const apiBrowser = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>("POST", path, { body, query }),
  put: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>("PUT", path, { body, query }),
  patch: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>("PATCH", path, { body, query }),
  del: <T>(path: string, query?: Query) => request<T>("DELETE", path, { query }),
};
