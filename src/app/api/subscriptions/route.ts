import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: return the authenticated user's subscriptions with farm info
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: subscriptions, error } = await supabase
      .from("buyer_subscriptions")
      .select("*, farm:farms(id, farm_name, city, state)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Subscriptions query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscriptions: subscriptions || [] });
  } catch (err) {
    console.error("Unexpected error in GET subscriptions:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST: create a new subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Accept both camelCase and snake_case field names
    const farmId = body.farmId || body.farm_id;
    const category = body.category;
    const productKeyword = body.productKeyword ?? body.product_keyword;
    const notificationChannel = body.notificationChannel ?? body.notification_channel;

    if (!farmId) {
      return NextResponse.json(
        { error: "farmId is required" },
        { status: 400 }
      );
    }

    if (!notificationChannel || !["email", "sms"].includes(notificationChannel)) {
      return NextResponse.json(
        { error: "notificationChannel must be 'email' or 'sms'" },
        { status: 400 }
      );
    }

    // Verify the farm exists
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select("id")
      .eq("id", farmId)
      .single();

    if (farmError || !farm) {
      return NextResponse.json(
        { error: "Farm not found" },
        { status: 404 }
      );
    }

    // Check for duplicate active subscription
    let dupQuery = supabase
      .from("buyer_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("farm_id", farmId)
      .eq("is_active", true);

    if (category) {
      dupQuery = dupQuery.eq("category", category);
    } else {
      dupQuery = dupQuery.is("category", null);
    }

    if (productKeyword) {
      dupQuery = dupQuery.eq("product_keyword", productKeyword);
    } else {
      dupQuery = dupQuery.is("product_keyword", null);
    }

    const { data: existing } = await dupQuery;

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "You already have an active subscription matching these criteria" },
        { status: 409 }
      );
    }

    const { data: subscription, error: insertError } = await supabase
      .from("buyer_subscriptions")
      .insert({
        user_id: user.id,
        farm_id: farmId,
        category: category || null,
        product_keyword: productKeyword || null,
        notification_channel: notificationChannel,
        is_active: true,
      })
      .select("*, farm:farms(id, farm_name, city, state)")
      .single();

    if (insertError || !subscription) {
      console.error("Subscription insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in POST subscriptions:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE: deactivate a subscription by id
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accept id from query param or JSON body
    const { searchParams } = request.nextUrl;
    let subscriptionId = searchParams.get("id");

    if (!subscriptionId) {
      try {
        const body = await request.json();
        subscriptionId = body.id || null;
      } catch {
        // No JSON body provided
      }
    }

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription id is required as a query parameter or in the request body" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: subscription, error: fetchError } = await supabase
      .from("buyer_subscriptions")
      .select("id, user_id")
      .eq("id", subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to modify this subscription" },
        { status: 403 }
      );
    }

    // Soft delete: set is_active to false
    const { error: updateError } = await supabase
      .from("buyer_subscriptions")
      .update({ is_active: false })
      .eq("id", subscriptionId);

    if (updateError) {
      console.error("Subscription deactivation error:", updateError);
      return NextResponse.json(
        { error: "Failed to deactivate subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in DELETE subscriptions:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
