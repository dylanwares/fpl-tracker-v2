"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { useActiveTab } from "./use-active-tab";

/** Desktop navigation (≥1024px). Same five items as the bottom bar. */
export function Sidebar() {
  const [active, onTap] = useActiveTab();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-60 shrink-0 flex-col border-r border-border bg-bg lg:flex"
      aria-label="Primary"
    >
      <div className="flex h-14 items-center px-5">
        <span className="text-[15px] font-semibold tracking-tight text-text-1">
          FPL <span className="text-accent-400">Tracker</span>
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = active === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => onTap(item.href)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-[8px] border-l-2 px-3 text-[14px] font-medium transition-colors duration-100 ease-out",
                isActive
                  ? "border-accent-400 bg-surface-2 text-text-1"
                  : "border-transparent text-text-2 hover:bg-surface-1 hover:text-text-1",
              )}
            >
              <Icon size={18} aria-hidden className={isActive ? "text-accent-400" : undefined} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
