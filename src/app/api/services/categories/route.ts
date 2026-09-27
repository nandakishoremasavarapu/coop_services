import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceCategories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const categories = await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.isActive, true))
      .orderBy(asc(serviceCategories.sortOrder));
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
