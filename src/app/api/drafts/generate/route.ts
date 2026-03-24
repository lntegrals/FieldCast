import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

const EXTRACTION_SYSTEM_PROMPT = `You are a farm produce listing assistant. Extract structured data from farmer voice notes. Return JSON with:
- title (string): A concise buyer-friendly title, e.g. "Fresh Organic Tomatoes - 20 lbs"
- category (string|null): produce category like "vegetables", "fruits", "herbs", "dairy", "eggs", "meat", etc.
- product_name (string): the product name, e.g. "Tomatoes"
- description (string|null): A 1-2 sentence buyer-friendly description. Generate this from context even if not explicitly stated.
- quantity_available (number|null): numeric quantity
- quantity_unit (string|null): unit like "lbs", "bushels", "dozen", "bunches"
- price_amount (number|null): price as a number
- price_unit (string|null): pricing unit like "lb", "each", "dozen", "bushel"
- harvest_date (string|null): ISO date string if mentioned, otherwise null
- fulfillment_type (string|null): "pickup", "delivery", or "both"
- pickup_location (string|null): location if mentioned
- pickup_start_time (string|null): HH:MM 24h format
- pickup_end_time (string|null): HH:MM 24h format
- ai_confidence (number): 0-1 confidence score for the overall extraction
- missing_fields (string[]): array of field names that couldn't be determined from the transcript

Generate a buyer-friendly description even if the farmer didn't explicitly describe the produce. If information is missing, leave the field null and include it in missing_fields. Return ONLY valid JSON, no markdown fences.`;

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
    const { draftId, transcript } = body;

    if (!draftId || !transcript) {
      return NextResponse.json(
        { error: "draftId and transcript are required" },
        { status: 400 }
      );
    }

    // Get the draft and verify ownership
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
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select("id")
      .eq("id", draft.farm_id)
      .eq("owner_user_id", user.id)
      .single();

    if (farmError || !farm) {
      return NextResponse.json(
        { error: "You don't have permission to update this draft" },
        { status: 403 }
      );
    }

    // Re-run AI extraction on the edited transcript
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Transcript from farmer voice note:\n\n"${transcript}"`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI extraction returned empty response" },
        { status: 500 }
      );
    }

    const extractedData = JSON.parse(content);

    // Update the draft with new extracted data
    const { data: updatedDraft, error: updateError } = await supabase
      .from("listing_drafts")
      .update({
        title: extractedData.title || "Untitled Listing",
        category: extractedData.category,
        product_name: extractedData.product_name || "Unknown Product",
        description: extractedData.description,
        quantity_available: extractedData.quantity_available,
        quantity_unit: extractedData.quantity_unit,
        price_amount: extractedData.price_amount,
        price_unit: extractedData.price_unit,
        harvest_date: extractedData.harvest_date,
        fulfillment_type: extractedData.fulfillment_type,
        pickup_location: extractedData.pickup_location,
        pickup_start_time: extractedData.pickup_start_time,
        pickup_end_time: extractedData.pickup_end_time,
        status: "review",
        ai_confidence: extractedData.ai_confidence,
        missing_fields_json: extractedData.missing_fields,
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
