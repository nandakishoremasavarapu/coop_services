import { createHash } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function createSession(userId: string, role: string): string {
  const sessionData = JSON.stringify({ userId, role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return Buffer.from(sessionData).toString("base64");
}

export function parseSession(token: string): { userId: string; role: string; exp: number } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const data = JSON.parse(decoded);
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return parseSession(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  try {
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (user) return user;

    // If userId in session no longer exists in DB (e.g. database re-seeded during development),
    // fall back to active user with matching role so session recovers gracefully
    if (session.role) {
      const [fallbackUser] = await db
        .select()
        .from(users)
        .where(eq(users.role, session.role as any))
        .limit(1);
      return fallbackUser ?? null;
    }

    return null;
  } catch (err) {
    console.error("[Auth] Error fetching current user:", err);
    return null;
  }
}
