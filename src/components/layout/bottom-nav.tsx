"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { useActiveTab } from "./use-active-tab";

/** Mobile navigation. Hidden at ≥1024px, where the sidebar takes over. */
export function BottomNav() {
  const [active, onTap] = useActiveTab();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Primary"
    >
      <ul className="flex h-14">
        {navItems.map((item) => {
          const isActive = active === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative flex-1">
              {isActive && (
                <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-accent-400" />
              )}
              <Link
                href={item.href}
                prefetch
                onClick={() => onTap(item.href)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 transition-colors duration-100 ease-out active:bg-surface-1",
                  isActive ? "text-accent-400" : "text-text-3",
                )}
              >
                <Icon size={22} strokeWidth={isActive ? 2.25 : 2} aria-hidden />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
