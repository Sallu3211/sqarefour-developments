import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  formatDistanceToNow,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

export function formatMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${CURRENCY} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

/** For an entry that may span a date range, e.g. "17 – 20 Sep 2026". */
export function formatEntryDate(start: string, end?: string | null): string {
  if (!end || end === start) return formatDate(start);
  const s = parseISO(start);
  const e = parseISO(end);
  const sameMonth = format(s, "yyyy-MM") === format(e, "yyyy-MM");
  return sameMonth ? `${format(s, "d")} – ${format(e, "d MMM yyyy")}` : `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy, h:mm a");
}

export function relativeTime(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function weekRange(date: Date = new Date()) {
  return {
    start: format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

export function monthRange(date: Date = new Date()) {
  return {
    start: format(startOfMonth(date), "yyyy-MM-dd"),
    end: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export function yearRange(date: Date = new Date()) {
  return {
    start: format(startOfYear(date), "yyyy-MM-dd"),
    end: format(endOfYear(date), "yyyy-MM-dd"),
  };
}

export function dayRange(date: Date = new Date()) {
  const d = format(date, "yyyy-MM-dd");
  return { start: d, end: d };
}
