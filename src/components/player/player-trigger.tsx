"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePlayerSheet } from "./player-sheet-provider";

/**
 * Wraps anything that represents a player and makes it open the sheet.
 *
 * A real `<button>`, so it is keyboard reachable and announced as a control.
 * It carries no styling of its own beyond a pressed state — the thing inside
 * keeps its own layout.
 */
export function PlayerTrigger({
  elementId,
  name,
  className,
  children,
}: {
  elementId: number;
  /** For the accessible label — "Bruno Fernandes, more information". */
  name: string;
  className?: string;
  children: ReactNode;
}) {
  const { open } = usePlayerSheet();

  return (
    <button
      type="button"
      onClick={() => open(elementId)}
      aria-label={`${name}, more information`}
      className={cn(
        "text-left transition-opacity duration-100 ease-out active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400",
        className,
      )}
    >
      {children}
    </button>
  );
}
