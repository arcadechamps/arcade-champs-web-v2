/**
 * Converts a local `datetime-local` input value ("YYYY-MM-DDTHH:mm") to a UTC ISO string.
 * The browser's Date constructor treats the bare string as local time.
 */
export function datetimeLocalToIso(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

/**
 * Converts a UTC ISO string (from Supabase timestamptz) to a local
 * `datetime-local` input value so the edit form shows the correct local time.
 */
export function isoToDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formats a date/time value for display with both date and time, locale-aware.
 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
