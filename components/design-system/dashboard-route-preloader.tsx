"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isDashboardHref } from "@/lib/workspace/app-routes";

/**
 * Prefetch only on clear intent. Loading every module on hydration multiplied
 * authenticated database work before the user chose a destination.
 */
export function DashboardRoutePreloader() {
  const router = useRouter();

  useEffect(() => {
    const warmed = new Set<string>();
    const warm = (route: string) => {
      if (warmed.has(route)) return;
      warmed.add(route);
      router.prefetch(route);
    };

    const warmLinkedRoute = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!isDashboardHref(href)) return;
      warm(`${anchor.pathname}${anchor.search}`);
    };

    document.addEventListener("pointerover", warmLinkedRoute, true);
    document.addEventListener("focusin", warmLinkedRoute, true);

    return () => {
      document.removeEventListener("pointerover", warmLinkedRoute, true);
      document.removeEventListener("focusin", warmLinkedRoute, true);
    };
  }, [router]);

  return null;
}
