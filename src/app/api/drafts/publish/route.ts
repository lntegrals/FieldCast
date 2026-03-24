import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { draftId } = body;

    if (!draftId) {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 }
      );
    }

    // Get the draft
    const { data: draft, error: draftError } = await supabase
      .from("listing_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    // Verify farm ownership
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select("id")
      .eq("id", draft.farm_id)
      .eq("owner_user_id", user.id)
      .single();

    if (farmError || !farm) {
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

    // Create the listing from draft data
    const { data: listing, error: listingError } = await supabase
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

    // Trigger notifications: find matching buyer subscriptions
    let notifiedCount = 0;

    try {
      let subscriptionQuery = supabase
        .from("buyer_subscriptions")
        .select("id, user_id, notification_channel, category, product_keyword")
        .eq("farm_id", draft.farm_id)
        .eq("is_active", true);

      const { data: subscriptions } = await subscriptionQuery;

      if (subscriptions && subscriptions.length > 0) {
        // Filter subscriptions by category and product keyword match
        const matchingSubs = subscriptions.filter((sub) => {
          if (sub.category && draft.category && sub.category !== draft.category) {
            return false;
          }
          if (
            sub.product_keyword &&
            draft.product_name &&
            !draft.product_name
              .toLowerCase()
              .includes(sub.product_keyword.toLowerCase())
          ) {
            return false;
          }
          return true;
        });

        if (matchingSubs.length > 0) {
          const notificationRecords = matchingSubs.map((sub) => ({
            subscription_id: sub.id,
            listing_id: listing.id,
            channel: sub.notification_channel,
            delivery_status: "pending",
          }));

          const { data: notifications, error: notifError } = await supabase
            .from("notifications")
            .insert(notificationRecords)
            .select("id");

          if (!notifError && notifications) {
            notifiedCount = notifications.length;
          }
        }
      }
    } catch (notifErr) {
      // Log but don't fail the publish if notifications error
      console.error("Notification creation error:", notifErr);
    }

    return NextResponse.json({
      listingId: listing.id,
      notifiedCount,
    });
  } catch (err) {
    console.error("Unexpected error in drafts/publish:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
