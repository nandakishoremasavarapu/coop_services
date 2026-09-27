import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, customerProfiles, providerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const token = createSession(user.id, user.role);

    // Get profile info
    let profileName = "";
    if (user.role === "customer") {
      const [profile] = await db.select().from(customerProfiles).where(eq(customerProfiles.userId, user.id)).limit(1);
      profileName = profile?.fullName ?? "";
    } else if (user.role === "provider") {
      const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, user.id)).limit(1);
      profileName = profile?.displayName ?? "";
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        profileName,
      },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
