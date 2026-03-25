import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireFarmerWithFarm } from "@/lib/authz";
import { extractFromAudio } from "@/lib/ai/extract";
import { normalizePickupTime } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // --- RBAC: require authenticated farmer with farm ---
    const auth = await requireFarmerWithFarm();
    if (!auth.ok) return auth.response;
    const { farmId } = auth.user;

    const serviceClient = await createServiceClient();

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file (basic checks)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file too large (max 25MB)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // --- Idempotency: check for recent duplicate (same farm, within 10 seconds) ---
    const recentCutoff = new Date(Date.now() - 10_000).toISOString();
    const { data: recentDraft } = await serviceClient
      .from("listing_drafts")
      .select("id")
      .eq("farm_id", farmId)
      .gte("created_at", recentCutoff)
      .limit(1)
      .maybeSingle();

    if (recentDraft) {
      console.log(
        `[Idempotency] Returning existing draft ${recentDraft.id} instead of creating duplicate`
      );
      return NextResponse.json({ draftId: recentDraft.id, transcript: "" });
    }

    // Upload audio to Supabase Storage (best-effort)
    let publicUrl: string | null = null;
    try {
      const fileName = `${farmId}/${Date.now()}-${crypto.randomUUID()}.webm`;
      const { error: uploadError } = await serviceClient.storage
        .from("voice-notes")
        .upload(fileName, buffer, {
          contentType: audioFile.type || "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error (non-fatal):", uploadError);
      } else {
        publicUrl = serviceClient.storage
          .from("voice-notes")
          .getPublicUrl(fileName).data.publicUrl;
      }
    } catch (storageErr) {
      console.error("Storage upload exception (non-fatal):", storageErr);
    }

    // Create voice_note record
    const { data: voiceNote, error: vnError } = await serviceClient
      .from("voice_notes")
      .insert({
        farm_id: farmId,
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

    // --- AI extraction with validation & retry ---
    const mimeType = audioFile.type || "audio/webm";
    const { data: extracted, metrics } = await extractFromAudio(buffer, mimeType);

    console.log(`[AI Metrics] audio extraction:`, JSON.stringify(metrics));

    // Determine draft status based on extraction success
    const draftStatus = metrics.success ? "review" : "needs_review";

    // Create listing_draft
    const { data: draft, error: draftError } = await serviceClient
      .from("listing_drafts")
      .insert({
        farm_id: farmId,
        voice_note_id: voiceNote.id,
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
        status: draftStatus === "needs_review" ? "draft" : "review",
        ai_confidence: extracted.ai_confidence,
        missing_fields_json: extracted.missing_fields,
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

    // Update voice note with transcript
    await serviceClient
      .from("voice_notes")
      .update({
        transcript_raw: extracted.transcript,
        transcript_clean: extracted.transcript,
        transcription_status: metrics.success ? "completed" : "failed",
      })
      .eq("id", voiceNote.id);

    return NextResponse.json({
      draftId: draft.id,
      transcript: extracted.transcript,
    });
  } catch (err) {
    console.error("Unexpected error in voice/transcribe:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
