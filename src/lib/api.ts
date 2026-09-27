/**
 * Centralized API client for the Shram Setu frontend.
 *
 * All API calls go through `apiFetch`, which prefixes the configured backend
 * base URL and sends credentials so the FastAPI session cookie works.
 *
 * Configuration:
 *   NEXT_PUBLIC_API_BASE_URL  - base URL of the FastAPI backend,
 *                               e.g. "http://localhost:8000".
 *                               When empty, requests go to the same origin
 *                               (the built-in Next.js API routes are used as
 *                               an offline fallback).
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export interface ApiFetchOptions extends RequestInit {
  /** Set to false to omit the JSON content type (e.g. file uploads). */
  json?: boolean;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { json = true, headers, ...rest } = options;

  const finalHeaders = new Headers(headers || undefined);
  if (json && rest.body && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: "include",
  });
}

/** Convenience helper for JSON GET requests. */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path);
  return res.json() as Promise<T>;
}
