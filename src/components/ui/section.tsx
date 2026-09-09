"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Collapse state lives in localStorage and is read through `useSyncExternalStore`
 * rather than an effect, so the server and client snapshots are explicit and
 * hydration doesn't flash the wrong state.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Keep sections in step across tabs.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function useCollapse(id: string, defaultOpen: boolean): [boolean, () => void] {
  const key = `section:${id}`;

  const stored = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => null, // server: nothing persisted, fall back to the default
  );

  const open = stored === null ? defaultOpen : stored === "open";

  const toggle = useCallback(() => {
    window.localStorage.setItem(key, open ? "closed" : "open");
    emit();
  }, [key, open]);

  return [open, toggle];
}

/**
 * Collapsible card section (design spec §6.1).
 * Collapse state persists per section across sessions.
 */
export function Section({
  id,
  title,
  action,
  defaultOpen = true,
  children,
  className,
}: {
  /** Stable id — used as the localStorage key for the collapse state. */
  id: string;
  title: string;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, toggle] = useCollapse(id, defaultOpen);

  return (
    <section className={cn("rounded-[8px] border border-border bg-surface-1", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between gap-3 px-4 text-left transition-colors duration-150 ease-out hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-400"
      >
        <span className="text-[15px] font-semibold text-text-1">{title}</span>
        <span className="flex items-center gap-3">
          {action}
          <ChevronDown
            size={18}
            aria-hidden
            className={cn(
              "text-text-2 transition-transform duration-250 ease-out",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </section>
  );
}
