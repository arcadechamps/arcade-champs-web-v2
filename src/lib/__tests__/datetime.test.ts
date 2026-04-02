import { describe, it, expect } from "vitest";
import { datetimeLocalToIso, isoToDatetimeLocal, formatDateTime } from "../datetime";

describe("datetimeLocalToIso", () => {
  it("converts a datetime-local string to an ISO string", () => {
    const result = datetimeLocalToIso("2025-06-15T14:30");
    expect(result).toBeDefined();
    // Should be a valid ISO 8601 string ending in Z
    expect(result!.endsWith("Z")).toBe(true);
    // The parsed date should match the input interpreted as local time
    const d = new Date(result!);
    expect(d.getFullYear()).toBe(2025);
  });

  it("returns null for empty string", () => {
    expect(datetimeLocalToIso("")).toBeNull();
  });

  it("returns null for falsy input", () => {
    // @ts-expect-error testing runtime safety
    expect(datetimeLocalToIso(null)).toBeNull();
    // @ts-expect-error testing runtime safety
    expect(datetimeLocalToIso(undefined)).toBeNull();
  });
});

describe("isoToDatetimeLocal", () => {
  it("converts a UTC ISO string to local datetime-local format", () => {
    const iso = "2025-06-15T14:30:00Z";
    const result = isoToDatetimeLocal(iso);
    // Should be in YYYY-MM-DDTHH:mm format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("returns empty string for null", () => {
    expect(isoToDatetimeLocal(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(isoToDatetimeLocal(undefined)).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(isoToDatetimeLocal("not-a-date")).toBe("");
  });

  it("round-trips with datetimeLocalToIso", () => {
    // Create a known local datetime
    const original = "2025-06-15T14:30";
    const iso = datetimeLocalToIso(original)!;
    const backToLocal = isoToDatetimeLocal(iso);
    // After round-trip, should match original
    expect(backToLocal).toBe(original);
  });
});

describe("formatDateTime", () => {
  it("formats a valid Date object for display", () => {
    const result = formatDateTime(new Date("2025-06-15T14:30:00Z"));
    expect(typeof result).toBe("string");
    // Should contain the year
    expect(result).toContain("2025");
    // Should NOT be the em-dash fallback
    expect(result).not.toBe("—");
  });

  it("formats a valid ISO string for display", () => {
    const result = formatDateTime("2025-06-15T14:30:00Z");
    expect(result).toContain("2025");
    expect(result).not.toBe("—");
  });

  it('returns "—" for null', () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it('returns "—" for undefined', () => {
    expect(formatDateTime(undefined)).toBe("—");
  });

  it('returns "—" for invalid date string', () => {
    expect(formatDateTime("garbage")).toBe("—");
  });
});
