import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, bookings, providerProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const bookingQuotes = await db
      .select({
        quote: quotes,
        provider: providerProfiles,
      })
      .from(quotes)
      .leftJoin(providerProfiles, eq(quotes.providerId, providerProfiles.userId))
      .where(eq(quotes.bookingId, bookingId));

    return NextResponse.json({ quotes: bookingQuotes });
  } catch (error) {
    console.error("Quotes list error:", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "provider") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== "provider") {
      return NextResponse.json({ error: "Provider account not found" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, amount, note, estimatedArrival } = body;

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "bookingId and amount required" }, { status: 400 });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (!["submitted", "quoted"].includes(booking.status)) {
      return NextResponse.json({ error: "Cannot submit quote for this booking status" }, { status: 400 });
    }

    // Check if already quoted
    const [existing] = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.bookingId, bookingId), eq(quotes.providerId, user.id)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "You have already submitted a quote for this booking" }, { status: 409 });
    }

    const [newQuote] = await db
      .insert(quotes)
      .values({
        bookingId,
        providerId: user.id,
        amount: String(amount),
        note,
        estimatedArrival,
        version: 1,
        status: "submitted",
      })
      .returning();

    // Update booking status to quoted
    await db.update(bookings).set({ status: "quoted", updatedAt: new Date() }).where(eq(bookings.id, bookingId));

    return NextResponse.json({ success: true, quote: newQuote });
  } catch (error) {
    console.error("Submit quote error:", error);
    return NextResponse.json({ error: "Failed to submit quote" }, { status: 500 });
  }
}
