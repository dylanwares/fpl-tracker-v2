"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Each tab remembers where you were, the way a native tab bar does.
 *
 * Next resets scroll to the top on navigation; this restores the position the
 * tab was left at. Session-scoped, so a fresh launch starts at the top.
 */
export function ScrollMemory() {
  const pathname = usePathname();

  useEffect(() => {
    const key = `scroll:${pathname}`;

    const saved = window.sessionStorage.getItem(key);
    if (saved !== null) {
      // After paint, or the restore races Next's own scroll reset.
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)));
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        window.sessionStorage.setItem(key, String(window.scrollY));
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
