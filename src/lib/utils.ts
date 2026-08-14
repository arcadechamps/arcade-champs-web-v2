import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function exportToCSV<T>(
  filename: string,
  data: T[],
  columns: { header: string; accessor: (item: T) => string | number }[]
) {
  if (data.length === 0) return false;

  const headerRow = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const rows = data.map((item) =>
    columns
      .map((c) => {
        const val = c.accessor(item);
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csv = [headerRow, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Returns a human-readable relative time string (e.g. "5m ago", "2h ago", "3d ago").
 */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Returns a human-readable countdown string (e.g. "5m", "2h 30m", "3d 12h").
 * Returns "Ended" if the target date is in the past.
 */
export function timeLeft(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

/**
 * Formats an integer cent value as a dollar string (e.g. 1050 → "10.50").
 */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Parses an entry fee input value in cents.
 * Explicitly handles 0 cents without falling back to default fee.
 */
export function parseFeeInput(value: string | null | undefined, defaultCents = 100): number {
  if (value === null || value === undefined) return defaultCents;
  const parsedFee = parseInt(value, 10);
  return isNaN(parsedFee) ? defaultCents : Math.max(0, parsedFee);
}

/**
 * Formats a contest entry fee in cents for UI display.
 * Returns "Free" when fee is 0 or when user is an admin.
 */
export function formatContestFee(feeCents: number, includeFeeLabel = false, isAdmin = false): string {
  if (isAdmin) return includeFeeLabel ? "Free (Admin)" : "Free";
  if (feeCents === 0) return "Free";
  const formatted = `$${(feeCents / 100).toFixed(2)}`;
  return includeFeeLabel ? `${formatted} fee` : formatted;
}
