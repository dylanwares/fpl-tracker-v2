import { cn } from "@/lib/utils";

export type Rag = "green" | "amber" | "red" | "none";

/** Never colour alone — the letter carries the meaning too (design spec §6.3). */
const ragStyles: Record<Rag, { letter: string; text: string; fill: string; label: string }> = {
  green: { letter: "G", text: "text-good", fill: "bg-good/[0.18]", label: "Green" },
  amber: { letter: "A", text: "text-warn", fill: "bg-warn/[0.18]", label: "Amber" },
  red: { letter: "R", text: "text-bad", fill: "bg-bad/[0.18]", label: "Red" },
  none: { letter: "–", text: "text-neutral", fill: "bg-neutral/[0.14]", label: "Insufficient data" },
};

/** Row-level pill: 24×20px, RAG colour at 18% opacity, letter in RAG colour. */
export function RagPill({
  rag,
  title,
  className,
}: {
  rag: Rag;
  title?: string;
  className?: string;
}) {
  const style = ragStyles[rag];
  return (
    <span
      title={title ?? style.label}
      className={cn(
        "inline-flex h-5 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
        style.fill,
        style.text,
        className,
      )}
    >
      {style.letter}
      <span className="sr-only">{title ? `${title}: ${style.label}` : style.label}</span>
    </span>
  );
}

/** Compact table-cell form: 8px dot + the value in the RAG colour. */
export function RagValue({
  rag,
  children,
  className,
}: {
  rag: Rag;
  children: React.ReactNode;
  className?: string;
}) {
  const style = ragStyles[rag];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[14px] font-medium", className)}>
      <span
        aria-hidden
        className={cn("size-2 rounded-full", {
          "bg-good": rag === "green",
          "bg-warn": rag === "amber",
          "bg-bad": rag === "red",
          "bg-neutral": rag === "none",
        })}
      />
      <span className={style.text}>{children}</span>
    </span>
  );
}
