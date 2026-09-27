import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providerProfiles, users, providerSkills, skills, serviceCategories, societies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const societyId = searchParams.get("societyId");
    const verificationStatus = searchParams.get("verificationStatus");

    const providers = await db
      .select({
        provider: providerProfiles,
        user: {
          id: users.id,
          phone: users.phone,
          email: users.email,
          role: users.role,
        },
        society: societies,
      })
      .from(providerProfiles)
      .leftJoin(users, eq(providerProfiles.userId, users.id))
      .leftJoin(societies, eq(providerProfiles.societyId, societies.id));

    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Providers list error:", error);
    return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 });
  }
}
