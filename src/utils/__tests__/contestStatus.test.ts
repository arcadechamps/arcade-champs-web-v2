import { describe, it, expect, vi, afterEach } from "vitest";
import { getEffectiveStatus, withEffectiveStatus } from "../contestStatus";
import type { Contest } from "@/types/database";

/** Helper to build a minimal Contest object */
function makeContest(overrides: Partial<Contest> = {}): Contest {
  return {
    id: "c1",
    slug: "test-contest",
    title: "Test Contest",
    description: null,
    status: "upcoming",
    session_fee_cents: 100,
    session_duration_seconds: 300,
    prize_cents: 5000,
    prize_image_path: null,
    starts_at: null,
    ends_at: null,
    created_by: null,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getEffectiveStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the DB status when no dates are set", () => {
    const contest = makeContest({ status: "upcoming", starts_at: null, ends_at: null });
    expect(getEffectiveStatus(contest)).toBe("upcoming");
  });

  it('returns "closed" when ends_at is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const contest = makeContest({
      status: "active",
      ends_at: "2025-06-15T11:00:00Z", // 1 hour ago
    });
    expect(getEffectiveStatus(contest)).toBe("closed");
  });

  it('returns "closed" when current time equals ends_at exactly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const contest = makeContest({
      status: "active",
      ends_at: "2025-06-15T12:00:00Z",
    });
    expect(getEffectiveStatus(contest)).toBe("closed");
  });

  it('returns "active" when starts_at has passed and DB status is "upcoming"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const contest = makeContest({
      status: "upcoming",
      starts_at: "2025-06-15T10:00:00Z", // 2 hours ago
      ends_at: "2025-06-20T00:00:00Z",   // still in the future
    });
    expect(getEffectiveStatus(contest)).toBe("active");
  });

  it('keeps "active" status if already set in DB', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const contest = makeContest({
      status: "active",
      starts_at: "2025-06-14T00:00:00Z",
      ends_at: "2025-06-20T00:00:00Z",
    });
    expect(getEffectiveStatus(contest)).toBe("active");
  });

  it('returns DB status for upcoming contest that has not started yet', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const contest = makeContest({
      status: "upcoming",
      starts_at: "2025-06-20T00:00:00Z", // 5 days from now
      ends_at: "2025-06-25T00:00:00Z",
    });
    expect(getEffectiveStatus(contest)).toBe("upcoming");
  });
});

describe("withEffectiveStatus", () => {
  it("returns a new object with the computed status", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const contest = makeContest({
      status: "upcoming",
      starts_at: "2025-06-15T10:00:00Z",
      ends_at: "2025-06-20T00:00:00Z",
    });

    const result = withEffectiveStatus(contest);
    expect(result.status).toBe("active");
    // Original should be untouched
    expect(contest.status).toBe("upcoming");
    // Other fields preserved
    expect(result.title).toBe("Test Contest");
    expect(result.id).toBe("c1");

    vi.useRealTimers();
  });
});
