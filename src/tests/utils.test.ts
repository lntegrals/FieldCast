import { describe, it, expect } from "vitest";
import {
  normalizePickupTime,
  extractTimeHHMM,
  formatPickupTime,
  formatPrice,
  formatDate,
  timeAgo,
} from "@/lib/utils";

describe("normalizePickupTime", () => {
  it("converts HH:MM to ISO timestamp", () => {
    const result = normalizePickupTime("14:00");
    expect(result).not.toBeNull();
    expect(result).toContain("T");
    const d = new Date(result!);
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it("passes through valid ISO strings", () => {
    const iso = "2026-03-25T14:00:00.000Z";
    const result = normalizePickupTime(iso);
    expect(result).toBe(iso);
  });

  it("returns null for invalid values", () => {
    expect(normalizePickupTime(null)).toBeNull();
    expect(normalizePickupTime("")).toBeNull();
    expect(normalizePickupTime("not-a-time")).toBeNull();
    expect(normalizePickupTime("25:00")).toBeNull();
  });

  it("handles single-digit hours", () => {
    const result = normalizePickupTime("9:30");
    expect(result).not.toBeNull();
    const d = new Date(result!);
    expect(d.getUTCHours()).toBe(9);
    expect(d.getUTCMinutes()).toBe(30);
  });
});

describe("extractTimeHHMM", () => {
  it("extracts time from ISO timestamp", () => {
    expect(extractTimeHHMM("2026-03-25T14:30:00.000Z")).toBe("14:30");
  });

  it("passes through HH:MM values", () => {
    expect(extractTimeHHMM("14:30")).toBe("14:30");
  });

  it("pads single-digit hours", () => {
    expect(extractTimeHHMM("9:30")).toBe("09:30");
  });

  it("returns empty string for null/undefined", () => {
    expect(extractTimeHHMM(null)).toBe("");
    expect(extractTimeHHMM(undefined)).toBe("");
    expect(extractTimeHHMM("")).toBe("");
  });
});

describe("formatPickupTime", () => {
  it("formats 14:00 as 2:00 PM", () => {
    expect(formatPickupTime("2026-03-25T14:00:00.000Z")).toBe("2:00 PM");
  });

  it("formats 09:30 as 9:30 AM", () => {
    expect(formatPickupTime("09:30")).toBe("9:30 AM");
  });

  it("formats 00:00 as 12:00 AM", () => {
    expect(formatPickupTime("00:00")).toBe("12:00 AM");
  });

  it("formats 12:00 as 12:00 PM", () => {
    expect(formatPickupTime("12:00")).toBe("12:00 PM");
  });

  it("returns empty string for null", () => {
    expect(formatPickupTime(null)).toBe("");
  });
});

describe("formatPrice", () => {
  it("formats price with unit", () => {
    expect(formatPrice(3.5, "lb")).toBe("$3.50/lb");
  });

  it("formats price without unit", () => {
    expect(formatPrice(10, null)).toBe("$10.00");
  });

  it("returns TBD for null amount", () => {
    expect(formatPrice(null, "lb")).toBe("Price TBD");
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2026-03-25");
    expect(result).toContain("Mar");
    expect(result).toContain("2026");
  });
});
