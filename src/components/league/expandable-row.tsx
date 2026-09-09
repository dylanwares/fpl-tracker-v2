"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A standings row that opens to show that manager's squad.
 *
 * Every squad is rendered on the server and revealed with `hidden`, so opening
 * one is instant and no request is made — five managers is a small enough
 * payload that fetching on demand would be slower and more complex.
 */
export function ExpandableRow({
  header,
  children,
  highlight = false,
  label,
}: {
  header: ReactNode;
  children: ReactNode;
  highlight?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "border-b border-border last:border-b-0",
        highlight && "border-l-2 border-l-accent-400 bg-accent-glow",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`${label}, show squad`}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-100 ease-out active:bg-surface-2"
      >
        <span className="min-w-0 flex-1">{header}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "shrink-0 text-text-3 transition-transform duration-150 ease-out",
            open && "rotate-180",
          )}
        />
      </button>
      <div hidden={!open} className="border-t border-border bg-bg px-2 py-3">
        {children}
      </div>
    </div>
  );
}
