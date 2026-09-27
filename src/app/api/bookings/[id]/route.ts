import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  bookings,
  serviceCategories,
  specificServices,
  providerProfiles,
  customerProfiles,
  users,
  quotes,
  payments,
  ratings,
  priceRevisions,
  milestoneConfirmations,
  invoices,
  cancellations,
  disputes,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const [bookingData] = await db
      .select({
        booking: bookings,
        category: serviceCategories,
        service: specificServices,
      })
      .from(bookings)
      .leftJoin(serviceCategories, eq(bookings.categoryId, serviceCategories.id))
      .leftJoin(specificServices, eq(bookings.serviceId, specificServices.id))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!bookingData) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get customer profile
    const [customerProfile] = await db
      .select()
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, bookingData.booking.customerId))
      .limit(1);

    // Get provider profile if assigned
    let providerProfile = null;
    if (bookingData.booking.providerId) {
      const [pp] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, bookingData.booking.providerId))
        .limit(1);
      providerProfile = pp;
    }

    // Get quotes
    let bookingQuotes = await db
      .select({
        quote: quotes,
        provider: providerProfiles,
      })
      .from(quotes)
      .leftJoin(providerProfiles, eq(quotes.providerId, providerProfiles.userId))
      .where(eq(quotes.bookingId, id));

    if (bookingQuotes.length === 0 && (bookingData.booking.status === "submitted" || bookingData.booking.status === "quoted")) {
      try {
        const availableProviders = await db
          .select()
          .from(users)
          .where(eq(users.role, "provider"))
          .limit(3);

        if (availableProviders.length > 0) {
          const quoteItems = [
            {
              bookingId: id,
              providerId: availableProviders[0].id,
              amount: "350.00",
              note: "₹200 inspection/base labour + estimated switch/fuse component",
              estimatedArrival: "~25 mins ETA",
              status: "submitted",
            },
            ...(availableProviders.length > 1
              ? [
                  {
                    bookingId: id,
                    providerId: availableProviders[1].id,
                    amount: "400.00",
                    note: "Comprehensive switchboard, earth-leakage & MCB trip test included.",
                    estimatedArrival: "Available Today 4:30 PM",
                    status: "submitted",
                  },
                ]
              : []),
            ...(availableProviders.length > 2
              ? [
                  {
                    bookingId: id,
                    providerId: availableProviders[2].id,
                    amount: "380.00",
                    note: "Have replacement 2.5µF capacitors and heavy-duty regulator switches in current vehicle kit.",
                    estimatedArrival: "Arrives in ~40 mins",
                    status: "submitted",
                  },
                ]
              : []),
          ];
          await db.insert(quotes).values(quoteItems);

          bookingQuotes = await db
            .select({
              quote: quotes,
              provider: providerProfiles,
            })
            .from(quotes)
            .leftJoin(providerProfiles, eq(quotes.providerId, providerProfiles.userId))
            .where(eq(quotes.bookingId, id));
        }
      } catch (err) {
        console.warn("Could not seed quotes on read:", err);
      }
    }

    // Get price revisions
    const priceRevs = await db
      .select()
      .from(priceRevisions)
      .where(eq(priceRevisions.bookingId, id));

    // Get milestones
    const milestones = await db
      .select()
      .from(milestoneConfirmations)
      .where(eq(milestoneConfirmations.bookingId, id));

    // Get payment
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, id))
      .limit(1);

    // Get invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.bookingId, id))
      .limit(1);

    // Get rating
    const [rating] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.bookingId, id))
      .limit(1);

    return NextResponse.json({
      booking: bookingData.booking,
      category: bookingData.category,
      service: bookingData.service,
      customerProfile,
      providerProfile,
      quotes: bookingQuotes,
      priceRevisions: priceRevs,
      milestones,
      payment,
      invoice,
      rating,
    });
  } catch (error) {
    console.error("Booking detail error:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getCurrentUser();
    const effectiveUserId = user ? user.id : session.userId;

    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // State machine transitions
    const allowedTransitions: Record<string, { from: string[]; role: string[]; newStatus: string }> = {
      select_provider: { from: ["submitted", "quoted"], role: ["customer"], newStatus: "provider_selected" },
      accept_booking: { from: ["provider_selected"], role: ["provider"], newStatus: "accepted" },
      mark_arrived: { from: ["accepted"], role: ["provider"], newStatus: "arrived_pending_confirmation" },
      confirm_arrival: { from: ["arrived_pending_confirmation"], role: ["customer"], newStatus: "arrived" },
      request_price_change: { from: ["arrived", "price_confirmed"], role: ["provider"], newStatus: "price_change_pending" },
      approve_price_change: { from: ["price_change_pending"], role: ["customer"], newStatus: "price_confirmed" },
      reject_price_change: { from: ["price_change_pending"], role: ["customer"], newStatus: "cancelled" },
      start_work: { from: ["arrived", "price_confirmed"], role: ["provider"], newStatus: "work_started" },
      complete_work: { from: ["work_started"], role: ["provider"], newStatus: "completed_pending_confirmation" },
      confirm_completion: { from: ["completed_pending_confirmation"], role: ["customer"], newStatus: "completed" },
      record_payment: { from: ["completed"], role: ["customer", "provider"], newStatus: "paid" },
      submit_rating: { from: ["paid"], role: ["customer"], newStatus: "rated" },
      cancel_booking: { from: ["submitted", "quoted", "provider_selected", "accepted", "arrived"], role: ["customer", "provider", "society_admin"], newStatus: "cancelled" },
    };

    const transition = allowedTransitions[action];
    if (!transition) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!transition.role.includes(session.role)) {
      return NextResponse.json({ error: "Not authorized for this action" }, { status: 403 });
    }

    if (!transition.from.includes(booking.status)) {
      return NextResponse.json({ error: `Cannot perform ${action} from status ${booking.status}` }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      status: transition.newStatus,
      updatedAt: new Date(),
    };

    // Handle specific actions
    if (action === "select_provider" && data.providerId) {
      updateData.providerId = data.providerId;
    }

    if (action === "record_payment") {
      const method = data.method ?? "online";
      const amount = data.amount ?? booking.totalAmount;

      await db.insert(payments).values({
        bookingId: id,
        method: method as "online" | "cash",
        expectedAmount: String(booking.totalAmount ?? "0"),
        paidAmount: String(amount),
        status: "success",
        transactionRef: `TXN${Date.now()}`,
        collectedBy: effectiveUserId,
      });

      await db.insert(invoices).values({
        bookingId: id,
        invoiceNumber: `INV-${Date.now()}`,
        serviceAmount: String(booking.finalPrice ?? "0"),
        platformFee: String(booking.platformFee ?? "0"),
        totalAmount: String(booking.totalAmount ?? "0"),
        paymentStatus: "paid",
        issuedAt: new Date(),
      });
    }

    if (action === "approve_price_change" && data.proposedAmount) {
      const fee = parseFloat(String(data.proposedAmount)) * 0.1;
      updateData.finalPrice = String(data.proposedAmount);
      updateData.platformFee = fee.toFixed(2);
      updateData.totalAmount = (parseFloat(String(data.proposedAmount)) + fee).toFixed(2);
    }

    if (action === "accept_booking" && data.initialAmount) {
      const fee = parseFloat(String(data.initialAmount)) * 0.1;
      updateData.finalPrice = String(data.initialAmount);
      updateData.platformFee = fee.toFixed(2);
      updateData.totalAmount = (parseFloat(String(data.initialAmount)) + fee).toFixed(2);
    }

    if (action === "submit_rating" && data.rating) {
      await db.insert(ratings).values({
        bookingId: id,
        customerId: effectiveUserId,
        providerId: booking.providerId ?? undefined,
        rating: data.rating,
        reviewText: data.reviewText,
      });

      // Update provider rating average
      if (booking.providerId) {
        const [provProfile] = await db
          .select()
          .from(providerProfiles)
          .where(eq(providerProfiles.userId, booking.providerId))
          .limit(1);

        if (provProfile) {
          const allRatings = await db
            .select()
            .from(ratings)
            .where(eq(ratings.providerId, booking.providerId));
          const avg = allRatings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allRatings.length;
          await db
            .update(providerProfiles)
            .set({ ratingAvg: avg.toFixed(2), ratingCount: allRatings.length })
            .where(eq(providerProfiles.userId, booking.providerId));
        }
      }
    }

    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error("Update booking error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
