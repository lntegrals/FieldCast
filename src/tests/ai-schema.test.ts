import { describe, it, expect } from "vitest";
import { ListingExtractionSchema, ReExtractionSchema } from "@/lib/ai/schema";

describe("ListingExtractionSchema", () => {
  it("validates a complete valid extraction", () => {
    const input = {
      transcript: "I have 20 pounds of tomatoes at 3 dollars a pound",
      title: "Fresh Tomatoes - 20 lbs",
      category: "vegetables",
      product_name: "Tomatoes",
      description: "Fresh garden tomatoes, picked today.",
      quantity_available: 20,
      quantity_unit: "lbs",
      price_amount: 3.0,
      price_unit: "lb",
      harvest_date: "2026-03-25",
      fulfillment_type: "pickup",
      pickup_location: "Farm gate",
      pickup_start_time: "14:00",
      pickup_end_time: "17:00",
      ai_confidence: 0.92,
      missing_fields: [],
    };

    const result = ListingExtractionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.product_name).toBe("Tomatoes");
      expect(result.data.category).toBe("vegetables");
      expect(result.data.ai_confidence).toBe(0.92);
    }
  });

  it("normalizes category to lowercase and matches valid categories", () => {
    const input = {
      transcript: "test",
      title: "Test",
      category: "Vegetables",
      product_name: "Test",
      ai_confidence: 0.5,
    };

    const result = ListingExtractionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("vegetables");
    }
  });

  it("normalizes unknown category to 'other'", () => {
    const input = {
      transcript: "test",
      title: "Test",
      category: "something_random",
      product_name: "Test",
      ai_confidence: 0.5,
    };

    const result = ListingExtractionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("other");
    }
  });

  it("applies defaults for missing optional fields", () => {
    const input = {
      transcript: "I got tomatoes",
      title: "Tomatoes",
      product_name: "Tomatoes",
      ai_confidence: 0.7,
    };

    const result = ListingExtractionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBeNull();
      expect(result.data.description).toBeNull();
      expect(result.data.quantity_available).toBeNull();
      expect(result.data.price_amount).toBeNull();
      expect(result.data.missing_fields).toEqual([]);
    }
  });

  it("coerces string numbers to actual numbers", () => {
    const input = {
      transcript: "test",
      title: "Test",
      product_name: "Test",
      quantity_available: "20",
      price_amount: "3.50",
      ai_confidence: 0.5,
    };

    const result = ListingExtractionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity_available).toBe(20);
      expect(result.data.price_amount).toBe(3.5);
    }
  });

  it("clamps ai_confidence out of range to default via .catch()", () => {
    const input = {
      transcript: "test",
      title: "Test",
      product_name: "Test",
      ai_confidence: 1.5, // Out of range — caught by .catch(0.5)
    };

    const result = ListingExtractionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ai_confidence).toBe(0.5); // Fell back to default
    }
  });

  it("catches ai_confidence to default 0.5 when invalid type", () => {
    const input = {
      transcript: "test",
      title: "Test",
      product_name: "Test",
      ai_confidence: "high", // Not a number
    };

    const result = ListingExtractionSchema.safeParse(input);
    // .catch(0.5) handles this
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ai_confidence).toBe(0.5);
    }
  });

  it("normalizes fulfillment_type to valid values", () => {
    const tests = [
      { input: "Pickup", expected: "pickup" },
      { input: "DELIVERY", expected: "delivery" },
      { input: "Both", expected: "both" },
      { input: "ship", expected: null },
    ];

    for (const t of tests) {
      const input = {
        transcript: "test",
        title: "Test",
        product_name: "Test",
        fulfillment_type: t.input,
        ai_confidence: 0.5,
      };

      const result = ListingExtractionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fulfillment_type).toBe(t.expected);
      }
    }
  });

  it("handles completely empty object with defaults", () => {
    const input = {};
    const result = ListingExtractionSchema.safeParse(input);
    // Should still parse thanks to defaults
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transcript).toBe("");
      expect(result.data.title).toBe("Untitled Listing");
      expect(result.data.product_name).toBe("Unknown Product");
    }
  });
});

describe("ReExtractionSchema", () => {
  it("works without transcript field", () => {
    const input = {
      title: "Test Listing",
      product_name: "Test",
      ai_confidence: 0.8,
    };

    const result = ReExtractionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Test Listing");
    }
  });
});
