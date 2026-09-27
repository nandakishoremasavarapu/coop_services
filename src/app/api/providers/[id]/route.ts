import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  providerProfiles,
  users,
  providerSkills,
  skills,
  serviceCategories,
  societies,
  certifications,
  welfareRecords,
  identityVerifications,
  ratings,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [provider] = await db
      .select({
        provider: providerProfiles,
        user: {
          id: users.id,
          phone: users.phone,
          email: users.email,
        },
        society: societies,
      })
      .from(providerProfiles)
      .leftJoin(users, eq(providerProfiles.userId, users.id))
      .leftJoin(societies, eq(providerProfiles.societyId, societies.id))
      .where(eq(providerProfiles.id, id))
      .limit(1);

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const provSkills = await db
      .select({ skill: skills, category: serviceCategories, yearsExp: providerSkills.yearsExp })
      .from(providerSkills)
      .leftJoin(skills, eq(providerSkills.skillId, skills.id))
      .leftJoin(serviceCategories, eq(skills.categoryId, serviceCategories.id))
      .where(eq(providerSkills.providerId, id));

    const certs = await db
      .select()
      .from(certifications)
      .where(eq(certifications.providerId, id));

    const welfare = await db
      .select()
      .from(welfareRecords)
      .where(eq(welfareRecords.providerId, id));

    const [verification] = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, provider.provider.userId))
      .limit(1);

    const provRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.providerId, provider.provider.userId))
      .limit(10);

    return NextResponse.json({
      provider,
      skills: provSkills,
      certifications: certs,
      welfare,
      verification,
      ratings: provRatings,
    });
  } catch (error) {
    console.error("Provider detail error:", error);
    return NextResponse.json({ error: "Failed to fetch provider" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Only provider themselves or admin can update
    const [provider] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.id, id))
      .limit(1);

    if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const user = await getCurrentUser();
    const effectiveUserId = user ? user.id : session.userId;
    const isOwner = provider.userId === effectiveUserId;
    const isAdmin = session.role === "society_admin" || session.role === "federation_admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedFields: string[] = [
      "displayName", "experience", "bio", "serviceArea",
      "address", "city", "pincode", "availability",
    ];
    const adminFields: string[] = ["verificationStatus"];

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (isAdmin) {
      for (const field of adminFields) {
        if (body[field] !== undefined) updateData[field] = body[field];
      }
    }

    const [updated] = await db
      .update(providerProfiles)
      .set(updateData)
      .where(eq(providerProfiles.id, id))
      .returning();

    return NextResponse.json({ success: true, provider: updated });
  } catch (error) {
    console.error("Update provider error:", error);
    return NextResponse.json({ error: "Failed to update provider" }, { status: 500 });
  }
}
