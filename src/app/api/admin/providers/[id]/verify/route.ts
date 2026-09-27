import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providerProfiles, identityVerifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["society_admin", "federation_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!["verified", "failed", "review_required", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const [provider] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.id, id))
      .limit(1);

    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    // Update provider verification status
    await db
      .update(providerProfiles)
      .set({
        verificationStatus: status as "pending" | "verified" | "failed" | "review_required",
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.id, id));

    // Update identity verification record
    await db
      .update(identityVerifications)
      .set({
        status: status as "pending" | "verified" | "failed" | "review_required",
        reviewedBy: session.userId,
        verifiedAt: status === "verified" ? new Date() : undefined,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(identityVerifications.userId, provider.userId));

    return NextResponse.json({ success: true, message: `Provider ${status} successfully` });
  } catch (error) {
    console.error("Verify provider error:", error);
    return NextResponse.json({ error: "Failed to verify provider" }, { status: 500 });
  }
}
