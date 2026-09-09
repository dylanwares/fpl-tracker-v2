import { cn } from "@/lib/utils";

/**
 * Headline stat block (design spec §6.7) — the League page summary uses three
 * of these side by side, separated by 1px borders.
 */
export function Stat({
  label,
  value,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 flex-col items-center gap-1 px-3 py-4", className)}>
      <span
        className={cn("text-[28px] font-bold leading-none", {
          "text-text-1": tone === "neutral",
          "text-good": tone === "good",
          "text-bad": tone === "bad",
        })}
      >
        {value}
      </span>
      <span className="text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
        {label}
      </span>
    </div>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex divide-x divide-border rounded-[8px] border border-border bg-surface-1">
      {children}
    </div>
  );
}
