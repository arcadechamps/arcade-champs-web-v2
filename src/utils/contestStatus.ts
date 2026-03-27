import type { Contest, ContestStatus } from "@/types/database";

/**
 * Computes the effective status of a contest based on the current time.
 * - If ends_at has passed → "closed"
 * - If starts_at has passed and DB status is "upcoming" → "active"
 * - Otherwise → DB status as-is
 */
export function getEffectiveStatus(contest: Contest): ContestStatus {
  const now = new Date();

  if (contest.ends_at && now >= new Date(contest.ends_at)) {
    return "closed";
  }

  if (contest.starts_at && now >= new Date(contest.starts_at) && contest.status === "upcoming") {
    return "active";
  }

  return contest.status;
}

/**
 * Returns a new contest object with the effective status applied.
 */
export function withEffectiveStatus<T extends Contest>(contest: T): T {
  return { ...contest, status: getEffectiveStatus(contest) };
}
