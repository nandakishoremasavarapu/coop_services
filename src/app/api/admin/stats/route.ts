import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  bookings,
  users,
  providerProfiles,
  societies,
  federations,
  ratings,
  payments,
  disputes,
} from "@/db/schema";
import { eq, count, sql, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const defaultEmptyStats = {
    userCounts: [],
    bookingStatusCounts: [],
    providerAvailCounts: [],
    providerVerifCounts: [],
    societyCount: 0,
    avgRating: "0.0",
    totalPayments: "0",
    disputeCount: 0,
    recentBookings: [],
    bookingsByCategory: [],
  };

  try {
    const session = await getSession();
    if (!session || !["society_admin", "federation_admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ ...defaultEmptyStats, error: "Unauthorized" }, { status: 401 });
    }

    // Total users by role
    const userCounts = await db
      .select({ role: users.role, count: count() })
      .from(users)
      .groupBy(users.role)
      .catch((err: unknown) => {
        console.warn("[Admin Stats] userCounts query warning:", err);
        return [];
      });

    // Booking status counts
    const bookingStatusCounts = await db
      .select({ status: bookings.status, count: count() })
      .from(bookings)
      .groupBy(bookings.status)
      .catch((err: unknown) => {
        console.warn("[Admin Stats] bookingStatusCounts query warning:", err);
        return [];
      });

    // Provider availability counts
    const providerAvailCounts = await db
      .select({ availability: providerProfiles.availability, count: count() })
      .from(providerProfiles)
      .groupBy(providerProfiles.availability)
      .catch((err: unknown) => {
        console.warn("[Admin Stats] providerAvailCounts query warning:", err);
        return [];
      });

    // Provider verification counts
    const providerVerifCounts = await db
      .select({ status: providerProfiles.verificationStatus, count: count() })
      .from(providerProfiles)
      .groupBy(providerProfiles.verificationStatus)
      .catch((err: unknown) => {
        console.warn("[Admin Stats] providerVerifCounts query warning:", err);
        return [];
      });

    // Total societies
    const societyRows = await db
      .select({ societyCount: count() })
      .from(societies)
      .catch((err: unknown) => {
        console.warn("[Admin Stats] societies query warning:", err);
        return [{ societyCount: 0 }];
      });
    const societyCount = Number(societyRows?.[0]?.societyCount ?? 0);

    // Average rating
    const ratingRows = await db
      .select({ avgRating: sql<string>`AVG(${ratings.rating})` })
      .from(ratings)
      .catch((err: unknown) => {
        console.warn("[Admin Stats] ratings query warning:", err);
        return [{ avgRating: null }];
      });
    const avgRatingVal = ratingRows?.[0]?.avgRating;

    // Total payments
    const paymentRows = await db
      .select({ totalPayments: sql<string>`COALESCE(SUM(${payments.paidAmount}), 0)` })
      .from(payments)
      .where(eq(payments.status, "success"))
      .catch((err: unknown) => {
        console.warn("[Admin Stats] payments query warning:", err);
        return [{ totalPayments: "0" }];
      });
    const totalPaymentsVal = paymentRows?.[0]?.totalPayments;

    // Disputes
    const disputeRows = await db
      .select({ disputeCount: count() })
      .from(disputes)
      .where(eq(disputes.status, "open"))
      .catch((err: unknown) => {
        console.warn("[Admin Stats] disputes query warning:", err);
        return [{ disputeCount: 0 }];
      });
    const disputeCount = Number(disputeRows?.[0]?.disputeCount ?? 0);

    // Recent bookings per day (last 7 days)
    const recentBookings = await db
      .select({
        date: sql<string>`DATE(${bookings.createdAt})`,
        count: count(),
      })
      .from(bookings)
      .where(sql`${bookings.createdAt} >= NOW() - INTERVAL '7 days'`)
      .groupBy(sql`DATE(${bookings.createdAt})`)
      .orderBy(sql`DATE(${bookings.createdAt})`)
      .catch((err: unknown) => {
        console.warn("[Admin Stats] recentBookings query warning:", err);
        return [];
      });

    // Bookings by category
    const bookingsByCategory = await db
      .select({
        categoryId: bookings.categoryId,
        count: count(),
      })
      .from(bookings)
      .groupBy(bookings.categoryId)
      .limit(10)
      .catch((err: unknown) => {
        console.warn("[Admin Stats] bookingsByCategory query warning:", err);
        return [];
      });

    return NextResponse.json({
      userCounts: userCounts ?? [],
      bookingStatusCounts: bookingStatusCounts ?? [],
      providerAvailCounts: providerAvailCounts ?? [],
      providerVerifCounts: providerVerifCounts ?? [],
      societyCount,
      avgRating: avgRatingVal ? parseFloat(avgRatingVal).toFixed(1) : "0.0",
      totalPayments: totalPaymentsVal?.toString() ?? "0",
      disputeCount,
      recentBookings: recentBookings ?? [],
      bookingsByCategory: bookingsByCategory ?? [],
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ ...defaultEmptyStats, error: "Failed to fetch stats" }, { status: 500 });
  }
}
