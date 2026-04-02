import { describe, it, expect } from "vitest";
import { cn } from "../utils";

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
