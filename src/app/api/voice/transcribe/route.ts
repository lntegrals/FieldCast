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

    // Get user's farm
    const { data: farm, error: farmError } = await supabase
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

    // Upload audio to Supabase Storage
    const fileName = `${farm.id}/${Date.now()}-${crypto.randomUUID()}.webm`;
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("voice-notes")
      .upload(fileName, buffer, {
        contentType: audioFile.type || "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload audio file" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("voice-notes").getPublicUrl(fileName);

    // Create voice_note record with status "processing"
    const { data: voiceNote, error: vnError } = await supabase
      .from("voice_notes")
      .insert({
        farm_id: farm.id,
        audio_url: publicUrl,
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

    // Transcribe audio with OpenAI Whisper
    const audioBlob = new File([buffer], "recording.webm", {
      type: audioFile.type || "audio/webm",
    });

    let transcript: string;
    try {
      const transcription = await getOpenAI().audio.transcriptions.create({
        model: "whisper-1",
        file: audioBlob,
      });
      transcript = transcription.text;
    } catch (transcribeError) {
      console.error("Transcription error:", transcribeError);

      // Update voice note to failed
      await supabase
        .from("voice_notes")
        .update({ transcription_status: "failed" })
        .eq("id", voiceNote.id);

      return NextResponse.json(
        { error: "Failed to transcribe audio" },
        { status: 500 }
      );
    }

    // Extract structured data with GPT-4o-mini
    let extractedData: Record<string, unknown>;
    try {
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
      if (!content) throw new Error("Empty AI response");
      extractedData = JSON.parse(content);
    } catch (aiError) {
      console.error("AI extraction error:", aiError);

      // Still save the transcript even if extraction fails
      await supabase
        .from("voice_notes")
        .update({
          transcript_raw: transcript,
          transcription_status: "completed",
        })
        .eq("id", voiceNote.id);

      return NextResponse.json(
        { error: "Failed to extract listing data from transcript" },
        { status: 500 }
      );
    }

    // Create listing_draft
    const { data: draft, error: draftError } = await supabase
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
        pickup_start_time: extractedData.pickup_start_time as string | null,
        pickup_end_time: extractedData.pickup_end_time as string | null,
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
    await supabase
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
