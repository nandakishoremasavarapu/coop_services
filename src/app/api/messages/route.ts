import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, conversations, users, providerProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Verify conversation
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const participantIds = Array.isArray(conv.participantIds) ? conv.participantIds : [];
    if (!participantIds.includes(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark unread messages sent by the other user as read
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false)
        )
      );

    // Fetch all messages in conversation ordered chronologically
    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return NextResponse.json({ messages: allMessages });
  } catch (error) {
    console.error("Messages list error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, content, mediaUrl } = body;

    if (!conversationId || (!content?.trim() && !mediaUrl)) {
      return NextResponse.json({ error: "conversationId and content or media are required" }, { status: 400 });
    }

    // Verify conversation
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const participantIds = Array.isArray(conv.participantIds) ? conv.participantIds : [];
    if (!participantIds.includes(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert user's message
    const [newMsg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: user.id,
        content: content?.trim() || null,
        mediaUrl: mediaUrl || null,
        isRead: false,
        createdAt: new Date(),
      })
      .returning();

    let autoReply = null;

    // If message is from customer, generate an intelligent provider response
    if (user.role === "customer") {
      const otherId = (participantIds as string[]).find((id: string) => id !== user.id);
      let validOtherId: string | null = null;
      if (otherId) {
        try {
          const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, otherId)).limit(1);
          validOtherId = u?.id || null;
        } catch {
          validOtherId = null;
        }
      }
      if (!validOtherId) {
        const [firstProv] = await db.select({ id: users.id }).from(users).where(eq(users.role, "provider")).limit(1);
        validOtherId = firstProv?.id || null;
      }

      if (validOtherId) {
        const text = (content || "").toLowerCase();
        let replyText = "Received! Noted your update. Looking forward to completing your service smoothly.";

        if (mediaUrl || text.includes("photo") || text.includes("pic") || text.includes("audio") || text.includes("record")) {
          replyText = "Thank you for sharing this! The visual details help me prepare the exact diagnostic instruments and components before arriving.";
        } else if (text.includes("eta") || text.includes("time") || text.includes("reach") || text.includes("arrive") || text.includes("when")) {
          replyText = "I am on route in your society area. Traffic is clear and I should reach your doorstep in approximately 20-25 minutes.";
        } else if (text.includes("gate") || text.includes("security") || text.includes("flat") || text.includes("door") || text.includes("pass") || text.includes("code")) {
          replyText = "Understood, thank you! I will inform security at the gate and show my Cooperative Member ID. Coming straight to your flat.";
        } else if (text.includes("part") || text.includes("cost") || text.includes("price") || text.includes("estimate") || text.includes("material")) {
          replyText = "I carry genuine cooperative-approved standard components in my kit. Any replacement parts will be shown to you with transparent society prices before fitting.";
        } else if (text.includes("hi") || text.includes("hello") || text.includes("namaste") || text.includes("morning") || text.includes("afternoon")) {
          replyText = "Namaste! Happy to help. Please let me know if you have any questions or gate access instructions.";
        }

        // Insert auto-reply with timestamp slightly after customer message
        const replyDate = new Date(Date.now() + 1000);
        const [insertedReply] = await db
          .insert(messages)
          .values({
            conversationId,
            senderId: validOtherId,
            content: replyText,
            isRead: false,
            createdAt: replyDate,
          })
          .returning();

        autoReply = insertedReply;
      }
    }

    return NextResponse.json({ success: true, message: newMsg, autoReply });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
