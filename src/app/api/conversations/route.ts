import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  conversations,
  messages,
  bookings,
  serviceCategories,
  providerProfiles,
  customerProfiles,
  users,
  quotes,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingIdParam = searchParams.get("bookingId");
    const providerIdParam = searchParams.get("providerId");

    // If bookingId and providerId are requested, ensure a conversation exists
    if (bookingIdParam && providerIdParam) {
      await ensureConversationExists(bookingIdParam, user.id, providerIdParam);
    }

    // Also auto-ensure conversations for any active bookings the customer has
    if (user.role === "customer") {
      const activeBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.customerId, user.id))
        .orderBy(desc(bookings.createdAt))
        .limit(10);

      for (const bk of activeBookings) {
        if (bk.providerId) {
          await ensureConversationExists(bk.id, user.id, bk.providerId);
        } else {
          // If booking has quotes, ensure conversation for at least the primary quoting provider
          const bQuotes = await db
            .select()
            .from(quotes)
            .where(eq(quotes.bookingId, bk.id))
            .limit(3);
          for (const q of bQuotes) {
            await ensureConversationExists(bk.id, user.id, q.providerId);
          }
        }
      }
    }

    // Fetch all conversations
    const allConvs = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt));

    // Filter conversations where current user is a participant
    const userConvs = allConvs.filter((c: any) => {
      const pIds = Array.isArray(c.participantIds) ? (c.participantIds as string[]) : [];
      return pIds.includes(user.id);
    });

    const enrichedList = [];

    for (const conv of userConvs) {
      const pIds = Array.isArray(conv.participantIds) ? (conv.participantIds as string[]) : [];
      const otherId = pIds.find((id: string) => id !== user.id) || user.id;

      // Fetch other participant user details
      const [otherUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, otherId))
        .limit(1);

      let otherProfile = null;
      let displayName = "Cooperative Specialist";
      let photoUrl: string | null = null;
      let ratingAvg = "4.9";
      let trade = "Certified Service Provider";
      let phone = otherUser?.phone || "9200000001";

      if (otherUser?.role === "provider") {
        const [pp] = await db
          .select()
          .from(providerProfiles)
          .where(eq(providerProfiles.userId, otherId))
          .limit(1);
        if (pp) {
          otherProfile = pp;
          displayName = pp.displayName;
          photoUrl = pp.profilePhotoUrl;
          ratingAvg = pp.ratingAvg || "4.9";
          trade = pp.serviceArea || "Cooperative Technician";
        }
      } else {
        const [cp] = await db
          .select()
          .from(customerProfiles)
          .where(eq(customerProfiles.userId, otherId))
          .limit(1);
        if (cp) {
          otherProfile = cp;
          displayName = cp.fullName;
          trade = cp.city || "Resident Customer";
        }
      }

      // Fetch booking details if attached
      let bookingDetails = null;
      if (conv.bookingId) {
        const [bk] = await db
          .select({
            booking: bookings,
            category: serviceCategories,
          })
          .from(bookings)
          .leftJoin(serviceCategories, eq(bookings.categoryId, serviceCategories.id))
          .where(eq(bookings.id, conv.bookingId))
          .limit(1);

        if (bk) {
          bookingDetails = {
            id: bk.booking.id,
            status: bk.booking.status,
            serviceDescription: bk.booking.serviceDescription,
            categoryName: bk.category?.name || "Home Service",
            preferredTime: bk.booking.preferredTime,
            isEmergency: bk.booking.isEmergency,
            address: bk.booking.address,
          };
        }
      }

      // Fetch last message
      const [lastMsg] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Count unread
      const unreadMsgs = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            eq(messages.isRead, false)
          )
        );
      const unreadCount = unreadMsgs.filter((m: { id: string }) => Boolean(lastMsg && lastMsg.senderId !== user.id)).length;

      enrichedList.push({
        id: conv.id,
        bookingId: conv.bookingId,
        createdAt: conv.createdAt,
        otherParticipant: {
          id: otherId,
          role: otherUser?.role || "provider",
          displayName,
          photoUrl,
          ratingAvg,
          trade,
          phone,
        },
        booking: bookingDetails,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              mediaUrl: lastMsg.mediaUrl,
              senderId: lastMsg.senderId,
              isRead: lastMsg.isRead,
              createdAt: lastMsg.createdAt,
            }
          : null,
        unreadCount,
      });
    }

    // Sort by last message time, newest first
    enrichedList.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ conversations: enrichedList });
  } catch (error) {
    console.error("Conversations list error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, providerId } = body;

    if (!bookingId || !providerId) {
      return NextResponse.json({ error: "bookingId and providerId are required" }, { status: 400 });
    }

    const convId = await ensureConversationExists(bookingId, user.id, providerId);
    return NextResponse.json({ success: true, conversationId: convId });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

async function ensureConversationExists(bookingId: string | null, customerId: string, providerId: string): Promise<string> {
  // Validate and resolve valid providerId
  let validProviderId = providerId;
  const [provUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, providerId), eq(users.role, "provider")))
    .limit(1);

  if (!provUser) {
    const [firstProv] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "provider"))
      .limit(1);
    if (firstProv) validProviderId = firstProv.id;
  }

  // Validate and resolve valid bookingId
  let validBookingId: string | null = null;
  if (bookingId) {
    const [bk] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (bk) validBookingId = bk.id;
  }

  // Check if conversation already exists
  const allExisting = await db.select().from(conversations);
  for (const c of allExisting) {
    const pIds = Array.isArray(c.participantIds) ? (c.participantIds as string[]) : [];
    const sameBooking = validBookingId ? c.bookingId === validBookingId : true;
    if (sameBooking && pIds.includes(customerId) && pIds.includes(validProviderId)) {
      // Check if it already has messages, if not seed intro greeting
      const [existingMsg] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, c.id))
        .limit(1);

      if (!existingMsg) {
        const [pp] = await db
          .select()
          .from(providerProfiles)
          .where(eq(providerProfiles.userId, validProviderId))
          .limit(1);
        const providerName = pp?.displayName || "Specialist";

        await db.insert(messages).values({
          conversationId: c.id,
          senderId: validProviderId,
          content: `Namaste! I am ${providerName}, your assigned cooperative specialist. I've received your request and have the required tools ready. Please feel free to message any flat/gate instructions or specific questions!`,
          isRead: false,
          createdAt: new Date(),
        });
      }

      return c.id;
    }
  }

  // Create new conversation
  const [newConv] = await db
    .insert(conversations)
    .values({
      bookingId: validBookingId,
      participantIds: [customerId, validProviderId],
    })
    .returning();

  // Find provider name
  const [pp] = await db
    .select()
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, validProviderId))
    .limit(1);

  const providerName = pp?.displayName || "Specialist";

  // Pre-seed introductory message from provider
  await db.insert(messages).values({
    conversationId: newConv.id,
    senderId: validProviderId,
    content: `Namaste! I am ${providerName}, your assigned cooperative specialist. I've received your request and have the required tools ready. Please feel free to message any flat/gate instructions or specific questions!`,
    isRead: false,
    createdAt: new Date(),
  });

  return newConv.id;
}
