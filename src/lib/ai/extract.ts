import { GoogleGenerativeAI } from "@google/generative-ai";
import { ListingExtractionSchema, ReExtractionSchema } from "./schema";
import type { ListingExtraction, ReExtraction } from "./schema";

const MAX_RETRIES = 2;

function getModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

const AUDIO_EXTRACTION_PROMPT = `You are a farm produce listing assistant. Listen to this audio recording from a farmer describing their available harvest.

First, transcribe what the farmer said. Then extract structured listing data from the transcription.

Return ONLY valid JSON (no markdown fences) with these fields:
- transcript (string): The raw transcription of the audio
- title (string): A concise buyer-friendly title, e.g. "Fresh Organic Tomatoes - 20 lbs"
- category (string|null): produce category like "vegetables", "fruits", "herbs", "dairy", "eggs", "meat", "flowers", "other"
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

Generate a buyer-friendly description even if the farmer didn't explicitly describe the produce.
If information is missing, leave the field null and include it in missing_fields.`;

const TEXT_EXTRACTION_PROMPT = `You are a farm produce listing assistant. Extract structured data from farmer voice notes.

Return ONLY valid JSON (no markdown fences) with these fields:
- title (string): A concise buyer-friendly title, e.g. "Fresh Organic Tomatoes - 20 lbs"
- category (string|null): produce category like "vegetables", "fruits", "herbs", "dairy", "eggs", "meat", "flowers", "other"
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

Generate a buyer-friendly description even if the farmer didn't explicitly describe the produce.
If information is missing, leave the field null and include it in missing_fields.`;

const REPAIR_PROMPT = `The previous response was not valid JSON. Please return ONLY valid JSON with the requested fields. Do not wrap in markdown code fences. Do not include any other text.`;

/** Parse raw model text into JSON, stripping markdown fences. */
function parseModelResponse(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

interface ExtractionMetrics {
  attempts: number;
  parseFailures: number;
  validationFailures: number;
  latencyMs: number;
  success: boolean;
}

/**
 * Transcribe audio and extract listing data in a single Gemini call.
 * Includes retry with repair prompt and schema validation.
 */
export async function extractFromAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<{ data: ListingExtraction; metrics: ExtractionMetrics }> {
  const startTime = Date.now();
  const metrics: ExtractionMetrics = {
    attempts: 0,
    parseFailures: 0,
    validationFailures: 0,
    latencyMs: 0,
    success: false,
  };

  const model = getModel();
  const base64Audio = audioBuffer.toString("base64");

  let lastError: Error | null = null;
  let lastRaw: string = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    metrics.attempts++;

    try {
      const prompt =
        attempt === 0
          ? AUDIO_EXTRACTION_PROMPT
          : `${REPAIR_PROMPT}\n\nOriginal prompt:\n${AUDIO_EXTRACTION_PROMPT}\n\nPrevious broken response:\n${lastRaw}`;

      const parts =
        attempt === 0
          ? [
              { text: prompt },
              { inlineData: { mimeType, data: base64Audio } },
            ]
          : [
              { text: prompt },
              { inlineData: { mimeType, data: base64Audio } },
            ];

      const result = await model.generateContent(parts);
      lastRaw = result.response.text();

      let parsed: unknown;
      try {
        parsed = parseModelResponse(lastRaw);
      } catch {
        metrics.parseFailures++;
        lastError = new Error(`JSON parse failed on attempt ${attempt + 1}`);
        console.error(
          `[AI] Parse failure (attempt ${attempt + 1}):`,
          lastRaw.slice(0, 200)
        );
        continue;
      }

      const validated = ListingExtractionSchema.safeParse(parsed);
      if (!validated.success) {
        metrics.validationFailures++;
        lastError = new Error(
          `Validation failed: ${validated.error.issues.map((i) => `${i.path}: ${i.message}`).join(", ")}`
        );
        console.error(
          `[AI] Validation failure (attempt ${attempt + 1}):`,
          validated.error.issues
        );
        continue;
      }

      metrics.success = true;
      metrics.latencyMs = Date.now() - startTime;
      console.log(
        `[AI] Audio extraction succeeded in ${metrics.latencyMs}ms (${metrics.attempts} attempts)`
      );
      return { data: validated.data, metrics };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[AI] Unexpected error (attempt ${attempt + 1}):`, err);
    }
  }

  // All retries failed — return a fallback draft
  metrics.latencyMs = Date.now() - startTime;
  console.error(
    `[AI] All ${metrics.attempts} attempts failed. Returning fallback. Last error:`,
    lastError?.message
  );

  return {
    data: {
      transcript: "",
      title: "Needs Review",
      category: null,
      product_name: "Unknown Product",
      description: null,
      quantity_available: null,
      quantity_unit: null,
      price_amount: null,
      price_unit: null,
      harvest_date: null,
      fulfillment_type: null,
      pickup_location: null,
      pickup_start_time: null,
      pickup_end_time: null,
      ai_confidence: 0,
      missing_fields: [
        "title",
        "product_name",
        "category",
        "quantity_available",
        "price_amount",
        "description",
      ],
    },
    metrics,
  };
}

/**
 * Re-extract listing data from a text transcript (used for regeneration).
 * Includes retry with repair prompt and schema validation.
 */
export async function extractFromText(
  transcript: string
): Promise<{ data: ReExtraction; metrics: ExtractionMetrics }> {
  const startTime = Date.now();
  const metrics: ExtractionMetrics = {
    attempts: 0,
    parseFailures: 0,
    validationFailures: 0,
    latencyMs: 0,
    success: false,
  };

  const model = getModel();
  let lastError: Error | null = null;
  let lastRaw: string = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    metrics.attempts++;

    try {
      const prompt =
        attempt === 0
          ? `${TEXT_EXTRACTION_PROMPT}\n\nTranscript from farmer voice note:\n\n"${transcript}"`
          : `${REPAIR_PROMPT}\n\n${TEXT_EXTRACTION_PROMPT}\n\nTranscript:\n"${transcript}"\n\nPrevious broken response:\n${lastRaw}`;

      const result = await model.generateContent([{ text: prompt }]);
      lastRaw = result.response.text();

      let parsed: unknown;
      try {
        parsed = parseModelResponse(lastRaw);
      } catch {
        metrics.parseFailures++;
        lastError = new Error(`JSON parse failed on attempt ${attempt + 1}`);
        console.error(
          `[AI] Text parse failure (attempt ${attempt + 1}):`,
          lastRaw.slice(0, 200)
        );
        continue;
      }

      const validated = ReExtractionSchema.safeParse(parsed);
      if (!validated.success) {
        metrics.validationFailures++;
        lastError = new Error(
          `Validation failed: ${validated.error.issues.map((i) => `${i.path}: ${i.message}`).join(", ")}`
        );
        console.error(
          `[AI] Text validation failure (attempt ${attempt + 1}):`,
          validated.error.issues
        );
        continue;
      }

      metrics.success = true;
      metrics.latencyMs = Date.now() - startTime;
      console.log(
        `[AI] Text extraction succeeded in ${metrics.latencyMs}ms (${metrics.attempts} attempts)`
      );
      return { data: validated.data, metrics };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[AI] Text unexpected error (attempt ${attempt + 1}):`,
        err
      );
    }
  }

  metrics.latencyMs = Date.now() - startTime;
  console.error(
    `[AI] All text attempts failed. Returning fallback. Last error:`,
    lastError?.message
  );

  return {
    data: {
      title: "Needs Review",
      category: null,
      product_name: "Unknown Product",
      description: null,
      quantity_available: null,
      quantity_unit: null,
      price_amount: null,
      price_unit: null,
      harvest_date: null,
      fulfillment_type: null,
      pickup_location: null,
      pickup_start_time: null,
      pickup_end_time: null,
      ai_confidence: 0,
      missing_fields: [
        "title",
        "product_name",
        "category",
        "quantity_available",
        "price_amount",
        "description",
      ],
    },
    metrics,
  };
}
