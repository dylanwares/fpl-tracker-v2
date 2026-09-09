"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems } from "./nav-items";

export function matchesHref(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function hrefForPath(pathname: string) {
  return navItems.find((item) => matchesHref(pathname, item.href))?.href ?? "/";
}

/**
 * The tab bar highlights on tap, not when the navigation lands.
 *
 * A native tab bar responds instantly; waiting for the route to resolve is what
 * makes a web app feel like a web app. We record the tab that was tapped along
 * with the path it was tapped from — once the pathname changes, that record is
 * stale and ignored, so no effect is needed to clear it.
 */
export function useActiveTab(): [string, (href: string) => void] {
  const pathname = usePathname();
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);

  const active = tapped && tapped.from === pathname ? tapped.href : hrefForPath(pathname);

  return [active, (href: string) => setTapped({ href, from: pathname })];
}
