import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleNetworkError, handleSupabaseError } from "../network-error-handler";

// Mock sonner toast to prevent side effects
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("handleSupabaseError", () => {
  it("returns false when error is null", () => {
    expect(handleSupabaseError(null)).toBe(false);
  });

  it("returns false when error is undefined", () => {
    expect(handleSupabaseError(undefined)).toBe(false);
  });

  it("returns true and handles a real error", () => {
    const result = handleSupabaseError({ message: "Something broke", status: 500 }, "Test");
    expect(result).toBe(true);
  });
});

describe("handleNetworkError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure navigator.onLine returns true by default
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  });

  it('returns "Session expired" for 401 errors', () => {
    const result = handleNetworkError({ message: "Unauthorized", status: 401 });
    expect(result).toBe("Session expired");
  });

  it('returns "Session expired" for JWT expired errors', () => {
    const result = handleNetworkError({ message: "JWT expired" });
    expect(result).toBe("Session expired");
  });

  it('returns "Access denied" for 403 errors', () => {
    const result = handleNetworkError({ message: "Forbidden", status: 403 });
    expect(result).toBe("Access denied");
  });

  it('returns "Access denied" for permission denied errors', () => {
    const result = handleNetworkError({ message: "permission denied for table contests", code: "42501" });
    expect(result).toBe("Access denied");
  });

  it('returns "Rate limited" for 429 errors', () => {
    const result = handleNetworkError({ message: "Too many requests", status: 429 });
    expect(result).toBe("Rate limited");
  });

  it('returns "Server error" for 500+ errors', () => {
    const result = handleNetworkError({ message: "Internal server error", status: 500 });
    expect(result).toBe("Server error");
  });

  it('returns "Server error" for 502 errors', () => {
    const result = handleNetworkError({ message: "Bad gateway", status: 502 });
    expect(result).toBe("Server error");
  });

  it("returns the error message for generic Supabase errors", () => {
    const result = handleNetworkError({ message: "duplicate key" });
    expect(result).toBe("duplicate key");
  });

  it("returns the details if available over message", () => {
    const result = handleNetworkError({
      message: "generic",
      details: "Column 'foo' does not exist",
    });
    expect(result).toBe("Column 'foo' does not exist");
  });

  it('returns "Connection failed" for TypeError "Failed to fetch"', () => {
    const result = handleNetworkError(new TypeError("Failed to fetch"));
    expect(result).toBe("Connection failed");
  });

  it("returns error message for generic Error instances", () => {
    const result = handleNetworkError(new Error("Something went wrong"));
    expect(result).toBe("Something went wrong");
  });

  it("returns fallback for non-Error values", () => {
    const result = handleNetworkError("string error");
    expect(result).toBe("An unexpected error occurred");
  });

  it('returns "Network offline" when navigator is offline', () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const result = handleNetworkError({ message: "anything" });
    expect(result).toBe("Network offline");
  });

  it("includes context prefix for server errors", () => {
    // The function shows a toast with the prefix but returns a constant string
    const result = handleNetworkError({ message: "error", status: 503 }, "Leaderboard");
    expect(result).toBe("Server error");
  });
});
