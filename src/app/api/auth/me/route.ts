import { NextResponse } from "next/server";
import { getCurrentUser, getSession, createSession } from "@/lib/auth";
import { db } from "@/db";
import { customerProfiles, providerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let profileName = "";
    let profile = null;

    if (user.role === "customer") {
      const [p] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, user.id)).limit(1);
      profileName = p?.fullName ?? "";
      profile = p;
    } else if (user.role === "provider") {
      const [p] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, user.id)).limit(1);
      profileName = p?.displayName ?? "";
      profile = p;
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        profileName,
        profile,
      },
    });

    if (session && session.userId !== user.id) {
      response.cookies.set("session", createSession(user.id, user.role), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
