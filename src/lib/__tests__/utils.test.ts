import { describe, it, expect } from "vitest";
import { cn, parseFeeInput, formatContestFee } from "../utils";

describe("cn", () => {
  it("merges multiple class strings", () => {
    const result = cn("px-4", "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    const result = cn("px-4", "px-8");
    // tailwind-merge should keep the last one
    expect(result).toBe("px-8");
  });

  it("handles conditional classes (falsy values filtered)", () => {
    const isActive = false;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class");
  });

  it("includes conditional class when truthy", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("handles undefined and null gracefully", () => {
    const result = cn("text-sm", undefined, null, "font-bold");
    expect(result).toBe("text-sm font-bold");
  });

  it("handles empty calls", () => {
    expect(cn()).toBe("");
  });
});

describe("parseFeeInput", () => {
  it("correctly parses '0' as 0 cents without defaulting to 100", () => {
    expect(parseFeeInput("0")).toBe(0);
  });

  it("parses positive integer strings as cents", () => {
    expect(parseFeeInput("250")).toBe(250);
  });

  it("defaults to 100 cents when input is invalid or NaN", () => {
    expect(parseFeeInput("abc")).toBe(100);
    expect(parseFeeInput("")).toBe(100);
    expect(parseFeeInput(null)).toBe(100);
    expect(parseFeeInput(undefined)).toBe(100);
  });

  it("clamps negative fee inputs to 0", () => {
    expect(parseFeeInput("-50")).toBe(0);
  });
});

describe("formatContestFee", () => {
  it("returns 'Free' when fee is 0 cents", () => {
    expect(formatContestFee(0)).toBe("Free");
    expect(formatContestFee(0, true)).toBe("Free");
  });

  it("formats non-zero fees in dollars", () => {
    expect(formatContestFee(150)).toBe("$1.50");
    expect(formatContestFee(150, true)).toBe("$1.50 fee");
  });
});

