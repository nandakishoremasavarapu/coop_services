import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceRevisions, bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const revisions = await db
      .select()
      .from(priceRevisions)
      .where(eq(priceRevisions.bookingId, bookingId));

    return NextResponse.json({ revisions });
  } catch (error) {
    console.error("Price revisions error:", error);
    return NextResponse.json({ error: "Failed to fetch revisions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "provider") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, originalAmount, proposedAmount, reason } = body;

    if (!bookingId || !proposedAmount || !reason) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (!["arrived", "price_confirmed"].includes(booking.status)) {
      return NextResponse.json({ error: "Cannot request price change at this stage" }, { status: 400 });
    }

    const [revision] = await db
      .insert(priceRevisions)
      .values({
        bookingId,
        originalAmount: String(originalAmount ?? booking.finalPrice),
        proposedAmount: String(proposedAmount),
        reason,
        requesterId: session.userId,
        status: "pending",
      })
      .returning();

    // Update booking status
    await db
      .update(bookings)
      .set({ status: "price_change_pending", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));

    return NextResponse.json({ success: true, revision });
  } catch (error) {
    console.error("Price revision error:", error);
    return NextResponse.json({ error: "Failed to create price revision" }, { status: 500 });
  }
}
