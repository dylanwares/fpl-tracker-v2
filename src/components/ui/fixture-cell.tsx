import { cn } from "@/lib/utils";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Fixture difficulty cell (design spec §2.5). Desaturated fill, bright text,
 * so a full ticker grid stays readable rather than shouting.
 */
const difficultyClass: Record<Difficulty, string> = {
  1: "bg-[var(--fdr-1-bg)] text-[var(--fdr-1-fg)]",
  2: "bg-[var(--fdr-2-bg)] text-[var(--fdr-2-fg)]",
  3: "bg-[var(--fdr-3-bg)] text-[var(--fdr-3-fg)]",
  4: "bg-[var(--fdr-4-bg)] text-[var(--fdr-4-fg)]",
  5: "bg-[var(--fdr-5-bg)] text-[var(--fdr-5-fg)]",
};

export function FixtureCell({
  opponent,
  home,
  difficulty,
  className,
}: {
  /** Three-letter opponent code, e.g. "ARS". */
  opponent: string;
  home: boolean;
  difficulty: Difficulty;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 min-w-11 items-center justify-center rounded-[6px] px-1.5 text-[12px] font-semibold",
        difficultyClass[difficulty],
        className,
      )}
    >
      {home ? opponent.toUpperCase() : opponent.toLowerCase()}
      <span className="sr-only">{home ? " home" : " away"}</span>
    </span>
  );
}

/** Blank gameweek: surface-1 with a diagonal hatch. */
export function BlankCell({ className }: { className?: string }) {
  return (
    <span
      aria-label="Blank gameweek"
      className={cn(
        "inline-flex h-9 min-w-11 items-center justify-center rounded-[6px] bg-surface-1 text-[12px] text-text-3",
        "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.04)_4px,rgba(255,255,255,0.04)_8px)]",
        className,
      )}
    >
      –
    </span>
  );
}
