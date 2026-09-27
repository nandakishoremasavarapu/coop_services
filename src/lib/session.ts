/**
 * Server-side session helper for Next.js server components (layouts, pages).
 *
 * When the app is connected to the FastAPI backend
 * (NEXT_PUBLIC_API_BASE_URL set), the session cookie issued by FastAPI is
 * verified by calling the backend's /api/auth/me endpoint - no backend secret
 * is shared with the frontend. When the variable is empty, the legacy
 * local session format (built-in Next.js API routes) is parsed instead.
 *
 * API_BASE_URL_SERVER optionally overrides the URL used for server-to-server
 * calls (useful when the backend is reachable on an internal address, e.g.
 * http://localhost:8000, while browsers use a public URL).
 *
 * The result is cached per request so multiple layouts/pages sharing
 * `getServerSession()` perform a single backend verification.
 */

import { cache } from "react";
import { cookies } from "next/headers";

export interface ServerSession {
  userId: string;
  role: string;
}

const API_BASE_URL =
  process.env.API_BASE_URL_SERVER || process.env.NEXT_PUBLIC_API_BASE_URL || "";

/** Legacy local session parse (used only when no FastAPI backend is configured). */
function parseLegacySession(token: string): ServerSession | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const data = JSON.parse(decoded);
    if (!data?.userId || data.exp < Date.now()) return null;
    return { userId: data.userId as string, role: data.role as string };
  } catch {
    return null;
  }
}

export const getServerSession = cache(async (): Promise<ServerSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  if (!API_BASE_URL) {
    return parseLegacySession(token);
  }

  try {
    // Forward the session cookie to the FastAPI backend for verification.
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { cookie: `session=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.user?.id || !data?.user?.role) return null;
    return { userId: data.user.id, role: data.user.role };
  } catch (err) {
    console.error("[session] Backend verification failed:", err);
    return null;
  }
});
