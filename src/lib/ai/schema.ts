import { z } from "zod";

/** Canonical list of valid produce categories (lowercased). */
const VALID_CATEGORIES = [
  "vegetables",
  "fruits",
  "herbs",
  "dairy",
  "eggs",
  "meat",
  "flowers",
  "other",
] as const;

/**
 * Zod schema for AI-extracted listing data.
 * Coerces and normalizes values so that downstream code always gets clean types.
 */
export const ListingExtractionSchema = z.object({
  transcript: z.string().default(""),

  title: z
    .string()
    .min(1)
    .default("Untitled Listing"),

  category: z
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const lower = v.toLowerCase().trim();
      if ((VALID_CATEGORIES as readonly string[]).includes(lower)) return lower;
      // Attempt prefix match (e.g. "veg" → "vegetables")
      const match = VALID_CATEGORIES.find((c) => c.startsWith(lower));
      return match ?? "other";
    }),

  product_name: z
    .string()
    .min(1)
    .default("Unknown Product"),

  description: z.string().nullable().optional().default(null),

  quantity_available: z
    .union([z.number(), z.string().transform((s) => {
      const n = Number(s);
      return isNaN(n) ? null : n;
    })])
    .nullable()
    .optional()
    .default(null),

  quantity_unit: z.string().nullable().optional().default(null),

  price_amount: z
    .union([z.number(), z.string().transform((s) => {
      const n = Number(s);
      return isNaN(n) ? null : n;
    })])
    .nullable()
    .optional()
    .default(null),

  price_unit: z.string().nullable().optional().default(null),

  harvest_date: z
    .string()
    .nullable()
    .optional()
    .default(null),

  fulfillment_type: z
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const lower = v.toLowerCase().trim();
      if (["pickup", "delivery", "both"].includes(lower)) return lower;
      return null;
    }),

  pickup_location: z.string().nullable().optional().default(null),

  pickup_start_time: z.string().nullable().optional().default(null),
  pickup_end_time: z.string().nullable().optional().default(null),

  ai_confidence: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .catch(0.5),

  missing_fields: z
    .array(z.string())
    .default([])
    .catch([]),
});

export type ListingExtraction = z.infer<typeof ListingExtractionSchema>;

/**
 * Text-only extraction schema (no transcript field needed when re-extracting).
 */
export const ReExtractionSchema = ListingExtractionSchema.omit({ transcript: true });
export type ReExtraction = z.infer<typeof ReExtractionSchema>;
