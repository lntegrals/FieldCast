export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(amount: number | null, unit: string | null): string {
  if (amount == null) return "Price TBD";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
  return unit ? `${formatted}/${unit}` : formatted;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Normalizes a pickup time value for safe DB insert.
 * - If HH:MM format, converts to today's ISO timestamp at that time (UTC).
 * - If already ISO-like, passes through.
 * - If invalid, returns null.
 */
export function normalizePickupTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  const str = String(value).trim();

  // HH:MM pattern (e.g. "14:00" or "9:30")
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(str);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      const today = new Date();
      today.setUTCHours(h, m, 0, 0);
      return today.toISOString();
    }
    return null;
  }

  // Already ISO-like — validate it parses
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();

  return null;
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
