import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = request.nextUrl;
    const farmId = searchParams.get("farmId");
    const category = searchParams.get("category");
    const active = searchParams.get("active");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
    );

    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("listings")
      .select("*, farm:farms(id, farm_name, city, state)", { count: "exact" });

    if (farmId) {
      query = query.eq("farm_id", farmId);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (active === "true") {
      query = query.or(
        `expires_at.gt.${new Date().toISOString()},expires_at.is.null`
      );
    }

    query = query
      .order("published_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: listings, error, count } = await query;

    if (error) {
      console.error("Listings query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch listings" },
        { status: 500 }
      );
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return NextResponse.json({
      listings: listings || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (err) {
    console.error("Unexpected error in listings:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
