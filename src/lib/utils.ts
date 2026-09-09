import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes, later ones winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** FPL prices are in tenths of a million. */
export function formatPrice(nowCost: number): string {
  return `£${(nowCost / 10).toFixed(1)}m`;
}

/** Parse the API's numeric-looking strings, tolerating null/"" . */
export function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatSigned(value: number, digits = 0): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
}

/** "2h ago" style age, for the stale-data indicator in the app bar. */
export function timeAgo(from: Date | number, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(from).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
