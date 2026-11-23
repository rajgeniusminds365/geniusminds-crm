import { formatCurrency } from "@/lib/currency";
import { GM_DEFAULT_CURRENCY } from "./types";

/** Format money for GM pages; INR unless the row says otherwise. */
export function formatMoney(value: number, currency?: string | null): string {
  return formatCurrency(Number(value) || 0, currency || GM_DEFAULT_CURRENCY);
}

/** Local calendar date as YYYY-MM-DD (what <input type="date"> uses). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

/** Initials for the GM avatar bubble ("Aarav Mehta" → "AM"). */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?");
}

/** "2026-11-23" → locale date string, tolerant of empty values. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
