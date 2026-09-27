import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providerProfiles, users, societies, identityVerifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !["society_admin", "federation_admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providers = await db
      .select({
        provider: providerProfiles,
        user: {
          id: users.id,
          phone: users.phone,
          email: users.email,
          isActive: users.isActive,
          createdAt: users.createdAt,
        },
        society: societies,
      })
      .from(providerProfiles)
      .leftJoin(users, eq(providerProfiles.userId, users.id))
      .leftJoin(societies, eq(providerProfiles.societyId, societies.id))
      .orderBy(desc(providerProfiles.createdAt));

    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Admin providers error:", error);
    return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 });
  }
}
