import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { specificServices } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const services = await db
      .select()
      .from(specificServices)
      .where(and(eq(specificServices.categoryId, categoryId), eq(specificServices.isActive, true)));

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Specific services error:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
