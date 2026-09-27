import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, session.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return NextResponse.json({ notifications: userNotifs });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { notificationId } = body;

    if (notificationId) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));
    } else {
      // Mark all read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientId, session.userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications update error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
