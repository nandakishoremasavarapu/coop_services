import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  bookings,
  serviceCategories,
  specificServices,
  users,
  quotes,
  customerProfiles,
} from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { getSession, getCurrentUser, createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") ?? user.role;

    let bookingList;

    if (role === "customer") {
      bookingList = await db
        .select({
          booking: bookings,
          category: serviceCategories,
          service: specificServices,
        })
        .from(bookings)
        .leftJoin(serviceCategories, eq(bookings.categoryId, serviceCategories.id))
        .leftJoin(specificServices, eq(bookings.serviceId, specificServices.id))
        .where(eq(bookings.customerId, user.id))
        .orderBy(desc(bookings.createdAt));
    } else if (role === "provider") {
      bookingList = await db
        .select({
          booking: bookings,
          category: serviceCategories,
          service: specificServices,
        })
        .from(bookings)
        .leftJoin(serviceCategories, eq(bookings.categoryId, serviceCategories.id))
        .leftJoin(specificServices, eq(bookings.serviceId, specificServices.id))
        .where(
          or(
            eq(bookings.providerId, user.id),
            and(
              eq(bookings.status, "submitted"),
            )
          )
        )
        .orderBy(desc(bookings.createdAt));
    } else if (role === "society_admin" || role === "federation_admin") {
      bookingList = await db
        .select({
          booking: bookings,
          category: serviceCategories,
          service: specificServices,
        })
        .from(bookings)
        .leftJoin(serviceCategories, eq(bookings.categoryId, serviceCategories.id))
        .leftJoin(specificServices, eq(bookings.serviceId, specificServices.id))
        .orderBy(desc(bookings.createdAt))
        .limit(100);
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 });
    }

    const response = NextResponse.json({ bookings: bookingList });
    if (session.userId !== user.id) {
      response.cookies.set("session", createSession(user.id, user.role), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    console.error("Bookings list error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized. Please log in as a customer." }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== "customer") {
      return NextResponse.json({ error: "Customer account not found. Please log in again." }, { status: 401 });
    }

    const body = await request.json();
    const {
      categoryId,
      serviceId,
      serviceDescription,
      address,
      city,
      pincode,
      latitude,
      longitude,
      preferredTime,
      isEmergency,
      mediaUrls,
    } = body;

    if (!serviceDescription || !address) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Verify categoryId exists in DB, or fallback to first active category
    let finalCategoryId = categoryId;
    if (categoryId) {
      const [catRecord] = await db
        .select({ id: serviceCategories.id })
        .from(serviceCategories)
        .where(eq(serviceCategories.id, categoryId))
        .limit(1);
      if (!catRecord) {
        const [firstCat] = await db.select({ id: serviceCategories.id }).from(serviceCategories).limit(1);
        finalCategoryId = firstCat?.id;
      }
    } else {
      const [firstCat] = await db.select({ id: serviceCategories.id }).from(serviceCategories).limit(1);
      finalCategoryId = firstCat?.id;
    }

    // Verify serviceId if provided
    let finalServiceId: string | undefined = undefined;
    if (serviceId) {
      const [srvRecord] = await db
        .select({ id: specificServices.id })
        .from(specificServices)
        .where(eq(specificServices.id, serviceId))
        .limit(1);
      if (srvRecord) {
        finalServiceId = srvRecord.id;
      }
    }

    // Look up customer profile for defaults
    const [custProfile] = await db
      .select()
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, user.id))
      .limit(1);

    const [newBooking] = await db
      .insert(bookings)
      .values({
        customerId: user.id,
        categoryId: finalCategoryId,
        serviceId: finalServiceId,
        serviceDescription,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
        address,
        city: city || custProfile?.city || "Visakhapatnam",
        pincode: pincode || custProfile?.pincode || "530026",
        latitude: latitude ? String(latitude) : custProfile?.latitude ?? undefined,
        longitude: longitude ? String(longitude) : custProfile?.longitude ?? undefined,
        preferredTime: preferredTime ? new Date(preferredTime) : undefined,
        isEmergency: isEmergency ?? false,
        status: "submitted",
      })
      .returning();

    // Auto-generate initial quotes from available registered providers
    try {
      const availableProviders = await db
        .select()
        .from(users)
        .where(eq(users.role, "provider"))
        .limit(3);

      if (availableProviders.length > 0) {
        const quoteItems = [
          {
            bookingId: newBooking.id,
            providerId: availableProviders[0].id,
            amount: "350.00",
            note: "₹200 inspection/base labour + estimated switch/fuse component",
            estimatedArrival: "~25 mins ETA",
            status: "submitted",
          },
          ...(availableProviders.length > 1
            ? [
                {
                  bookingId: newBooking.id,
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
                  bookingId: newBooking.id,
                  providerId: availableProviders[2].id,
                  amount: "380.00",
                  note: "Have replacement 2.5µF capacitors and heavy-duty regulator switches.",
                  estimatedArrival: "Arrives in ~40 mins",
                  status: "submitted",
                },
              ]
            : []),
        ];

        await db.insert(quotes).values(quoteItems);
      }
    } catch (err) {
      console.warn("Could not pre-seed quotes for booking:", err);
    }

    const response = NextResponse.json({ success: true, booking: newBooking });

    // Reconcile and refresh cookie if user had a stale session ID
    if (session.userId !== user.id) {
      response.cookies.set("session", createSession(user.id, user.role), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
