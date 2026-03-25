import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireFarmerWithFarm } from "@/lib/authz";
import { extractFromText } from "@/lib/ai/extract";
import { normalizePickupTime } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // --- RBAC: require authenticated farmer with farm ---
    const auth = await requireFarmerWithFarm();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();

    const body = await request.json();
    const { draftId, transcript } = body;

    if (!draftId || !transcript) {
      return NextResponse.json(
        { error: "draftId and transcript are required" },
        { status: 400 }
      );
    }

    // Get the draft — only select needed columns
    const { data: draft, error: draftError } = await supabase
      .from("listing_drafts")
      .select("id, farm_id")
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
        { error: "You don't have permission to update this draft" },
        { status: 403 }
      );
    }

    // --- AI extraction with validation & retry ---
    const { data: extracted, metrics } = await extractFromText(transcript);

    console.log(`[AI Metrics] text re-extraction:`, JSON.stringify(metrics));

    // Update the draft with new extracted data
    const { data: updatedDraft, error: updateError } = await supabase
      .from("listing_drafts")
      .update({
        title: extracted.title,
        category: extracted.category,
        product_name: extracted.product_name,
        description: extracted.description,
        quantity_available: extracted.quantity_available,
        quantity_unit: extracted.quantity_unit,
        price_amount: extracted.price_amount,
        price_unit: extracted.price_unit,
        harvest_date: extracted.harvest_date,
        fulfillment_type: extracted.fulfillment_type,
        pickup_location: extracted.pickup_location,
        pickup_start_time: normalizePickupTime(extracted.pickup_start_time),
        pickup_end_time: normalizePickupTime(extracted.pickup_end_time),
        status: "review",
        ai_confidence: extracted.ai_confidence,
        missing_fields_json: extracted.missing_fields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .select()
      .single();

    if (updateError || !updatedDraft) {
      console.error("Draft update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft: updatedDraft });
  } catch (err) {
    console.error("Unexpected error in drafts/generate:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
