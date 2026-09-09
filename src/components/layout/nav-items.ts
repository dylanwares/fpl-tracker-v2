import { BarChart3, CalendarDays, Search, Shirt, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
}

/**
 * Five items — the maximum a bottom tab bar handles well (design spec §5.1).
 * Adding a sixth means rethinking the navigation, not appending to this list.
 */
export const navItems: NavItem[] = [
  { href: "/", label: "My Team", title: "My Team", icon: Shirt },
  { href: "/league", label: "League", title: "League", icon: Trophy },
  { href: "/analysis", label: "Analysis", title: "Analysis", icon: BarChart3 },
  { href: "/scout", label: "Scout", title: "Scout", icon: Search },
  { href: "/fixtures", label: "Fixtures", title: "Fixtures", icon: CalendarDays },
];

export function titleForHref(href: string): string {
  return navItems.find((item) => item.href === href)?.title ?? "FPL Tracker";
}
