import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireFarmerWithFarm } from "@/lib/authz";
import { getDispatcher } from "@/lib/notifications/dispatcher";

export async function POST(request: NextRequest) {
  try {
    // --- RBAC: require authenticated farmer with farm ---
    const auth = await requireFarmerWithFarm();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const body = await request.json();
    const { draftId } = body;

    if (!draftId) {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 }
      );
    }

    // Get the draft — explicit columns, no wildcard
    const { data: draft, error: draftError } = await supabase
      .from("listing_drafts")
      .select(
        "id, farm_id, title, category, product_name, description, quantity_available, quantity_unit, price_amount, price_unit, harvest_date, fulfillment_type, pickup_location, pickup_start_time, pickup_end_time, status"
      )
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    // Verify farm ownership
    if (draft.farm_id !== auth.user.farmId) {
      return NextResponse.json(
        { error: "You don't have permission to publish this draft" },
        { status: 403 }
      );
    }

    if (draft.status === "published") {
      return NextResponse.json(
        { error: "This draft has already been published" },
        { status: 409 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    // Create the listing
    const { data: listing, error: listingError } = await serviceClient
      .from("listings")
      .insert({
        farm_id: draft.farm_id,
        draft_id: draft.id,
        title: draft.title,
        category: draft.category,
        product_name: draft.product_name,
        description: draft.description,
        quantity_available: draft.quantity_available,
        quantity_unit: draft.quantity_unit,
        price_amount: draft.price_amount,
        price_unit: draft.price_unit,
        harvest_date: draft.harvest_date,
        fulfillment_type: draft.fulfillment_type,
        pickup_location: draft.pickup_location,
        pickup_start_time: draft.pickup_start_time,
        pickup_end_time: draft.pickup_end_time,
        published_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (listingError || !listing) {
      console.error("Listing insert error:", listingError);
      return NextResponse.json(
        { error: "Failed to create listing" },
        { status: 500 }
      );
    }

    // Update draft status to published
    await supabase
      .from("listing_drafts")
      .update({ status: "published", updated_at: now.toISOString() })
      .eq("id", draftId);

    // --- Notification dispatch with retry + state machine ---
    let notifiedCount = 0;
    let failedCount = 0;

    try {
      // Get farm name for notifications
      const { data: farm } = await serviceClient
        .from("farms")
        .select("farm_name")
        .eq("id", draft.farm_id)
        .single();

      const dispatcher = getDispatcher();
      const result = await dispatcher.publishAndNotify(
        serviceClient,
        listing.id,
        draft.farm_id,
        farm?.farm_name ?? "Farm",
        draft.title,
        draft.category,
        draft.product_name
      );

      notifiedCount = result.notifiedCount;
      failedCount = result.failedCount;
    } catch (notifErr) {
      console.error("Notification dispatch error:", notifErr);
    }

    return NextResponse.json({
      listingId: listing.id,
      notifiedCount,
      failedCount,
    });
  } catch (err) {
    console.error("Unexpected error in drafts/publish:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
