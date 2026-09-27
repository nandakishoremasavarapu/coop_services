import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, customerProfiles, providerProfiles, identityVerifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, role, fullName, email, address, city, pincode, experience, bio, societyId } = body;

    if (!phone || !password || !role || !fullName) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Check if phone already exists
    const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Phone number already registered" }, { status: 409 });
    }

    const passwordHash = hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({ phone, email, passwordHash, role })
      .returning();

    if (!newUser) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    if (role === "customer") {
      await db.insert(customerProfiles).values({
        userId: newUser.id,
        fullName,
        address,
        city,
        pincode,
      });
    } else if (role === "provider") {
      await db.insert(providerProfiles).values({
        userId: newUser.id,
        displayName: fullName,
        experience: experience ? parseInt(experience) : 0,
        bio,
        address,
        city,
        pincode,
        societyId: societyId || undefined,
        verificationStatus: "pending",
      });

      await db.insert(identityVerifications).values({
        userId: newUser.id,
        method: "manual",
        status: "pending",
        notes: "Awaiting society admin verification",
      });
    }

    const token = createSession(newUser.id, newUser.role);

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
        profileName: fullName,
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
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
