import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { normalizePickupTime } from "@/lib/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getGemini() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

const EXTRACTION_PROMPT = `You are a farm produce listing assistant. Listen to this audio recording from a farmer describing their available harvest.

First, transcribe what the farmer said. Then extract structured listing data from the transcription.

Return ONLY valid JSON (no markdown fences) with these fields:
- transcript (string): The raw transcription of the audio
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
- missing_fields (string[]): array of field names that couldn't be determined from the audio

Generate a buyer-friendly description even if the farmer didn't explicitly describe the produce. If information is missing, leave the field null and include it in missing_fields.`;

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

    // Use service client for storage + DB writes (bypasses RLS)
    const serviceClient = await createServiceClient();

    // Get user's farm
    const { data: farm, error: farmError } = await serviceClient
      .from("farms")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (farmError || !farm) {
      return NextResponse.json(
        { error: "No farm found for this user. Please create a farm first." },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Upload audio to Supabase Storage (best-effort — transcription still works without it)
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let publicUrl: string | null = null;

    try {
      const fileName = `${farm.id}/${Date.now()}-${crypto.randomUUID()}.webm`;
      const { error: uploadError } = await serviceClient.storage
        .from("voice-notes")
        .upload(fileName, buffer, {
          contentType: audioFile.type || "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error (non-fatal):", uploadError);
      } else {
        publicUrl = serviceClient.storage.from("voice-notes").getPublicUrl(fileName).data.publicUrl;
      }
    } catch (storageErr) {
      console.error("Storage upload exception (non-fatal):", storageErr);
    }

    // Create voice_note record with status "processing"
    const { data: voiceNote, error: vnError } = await serviceClient
      .from("voice_notes")
      .insert({
        farm_id: farm.id,
        audio_url: publicUrl || "",
        transcription_status: "processing",
      })
      .select("id")
      .single();

    if (vnError || !voiceNote) {
      console.error("Voice note insert error:", vnError);
      return NextResponse.json(
        { error: "Failed to create voice note record" },
        { status: 500 }
      );
    }

    // Use Gemini to transcribe audio AND extract structured data in one call
    let transcript: string;
    let extractedData: Record<string, unknown>;

    try {
      const model = getGemini();
      const base64Audio = buffer.toString("base64");

      const result = await model.generateContent([
        { text: EXTRACTION_PROMPT },
        {
          inlineData: {
            mimeType: audioFile.type || "audio/webm",
            data: base64Audio,
          },
        },
      ]);

      const responseText = result.response.text();
      // Strip markdown code fences if present
      const cleaned = responseText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      transcript = parsed.transcript || "";
      extractedData = parsed;
    } catch (aiError) {
      console.error("Gemini transcription/extraction error:", aiError);

      await serviceClient
        .from("voice_notes")
        .update({ transcription_status: "failed" })
        .eq("id", voiceNote.id);

      return NextResponse.json(
        { error: "Failed to transcribe and extract listing data" },
        { status: 500 }
      );
    }

    // Create listing_draft
    const { data: draft, error: draftError } = await serviceClient
      .from("listing_drafts")
      .insert({
        farm_id: farm.id,
        voice_note_id: voiceNote.id,
        title: (extractedData.title as string) || "Untitled Listing",
        category: extractedData.category as string | null,
        product_name:
          (extractedData.product_name as string) || "Unknown Product",
        description: extractedData.description as string | null,
        quantity_available: extractedData.quantity_available as number | null,
        quantity_unit: extractedData.quantity_unit as string | null,
        price_amount: extractedData.price_amount as number | null,
        price_unit: extractedData.price_unit as string | null,
        harvest_date: extractedData.harvest_date as string | null,
        fulfillment_type: extractedData.fulfillment_type as string | null,
        pickup_location: extractedData.pickup_location as string | null,
        pickup_start_time: normalizePickupTime(extractedData.pickup_start_time),
        pickup_end_time: normalizePickupTime(extractedData.pickup_end_time),
        status: "review",
        ai_confidence: extractedData.ai_confidence as number | null,
        missing_fields_json: extractedData.missing_fields as string[] | null,
      })
      .select("id")
      .single();

    if (draftError || !draft) {
      console.error("Draft insert error:", draftError);
      return NextResponse.json(
        { error: "Failed to create listing draft" },
        { status: 500 }
      );
    }

    // Update voice note with transcript and completed status
    await serviceClient
      .from("voice_notes")
      .update({
        transcript_raw: transcript,
        transcript_clean: transcript,
        transcription_status: "completed",
      })
      .eq("id", voiceNote.id);

    return NextResponse.json({
      draftId: draft.id,
      transcript,
    });
  } catch (err) {
    console.error("Unexpected error in voice/transcribe:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
