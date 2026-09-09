"use client";

import { cn } from "@/lib/utils";

export interface PillOption<T extends string | number> {
  value: T;
  label: string;
}

/**
 * Horizontally scrolling segmented filter pills (design spec §6.2).
 * Used for position filters, gameweek horizons, metric switches.
 */
export function FilterPills<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400",
              active
                ? "bg-accent-600 text-white"
                : "bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text-1",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
