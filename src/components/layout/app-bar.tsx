"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { refreshFplData } from "@/app/actions";
import { cn } from "@/lib/utils";
import { titleForHref } from "./nav-items";
import { useActiveTab } from "./use-active-tab";

interface AppBarProps {
  /** The gameweek we are planning for, e.g. 4. */
  gameweek: number | null;
  /** ISO deadline for that gameweek. */
  deadline: string | null;
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sticky top bar: page title left, gameweek + refresh right (design spec §5.1). */
export function AppBar({ gameweek, deadline }: AppBarProps) {
  // Same optimistic source as the tab bar, so the title changes on tap rather
  // than when the route resolves.
  const [active] = useActiveTab();
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-4 lg:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold leading-none tracking-tight text-text-1">
            {titleForHref(active)}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {gameweek !== null && (
            <div className="flex flex-col items-end">
              <span className="text-[12px] font-medium leading-tight text-text-2">
                GW{gameweek}
              </span>
              {deadline && (
                <span className="text-[11px] leading-tight text-text-3">
                  {formatDeadline(deadline)}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => startRefresh(() => refreshFplData())}
            disabled={isRefreshing}
            aria-label="Refresh data"
            className="flex size-11 items-center justify-center rounded-[8px] text-text-2 transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-text-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:opacity-50"
          >
            <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
