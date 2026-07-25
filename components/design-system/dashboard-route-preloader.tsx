"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Warms every primary dashboard route as soon as the shell hydrates and warms
 * dynamic destinations as soon as the user points at or focuses a link.
 * The App Router keeps the shell mounted and reuses the prefetched RSC result.
 */
export function DashboardRoutePreloader({ routes }: { routes: string[] }) {
  const router = useRouter();
  const routeKey = routes.join("|");

  useEffect(() => {
    const warm = (route: string) => {
      router.prefetch(route);
    };

    for (const route of routeKey.split("|").filter(Boolean)) {
      warm(route);
    }

    const warmLinkedRoute = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href^="/painel"]');
      if (!anchor) return;
      warm(`${anchor.pathname}${anchor.search}`);
    };

    document.addEventListener("pointerover", warmLinkedRoute, true);
    document.addEventListener("focusin", warmLinkedRoute, true);
    document.addEventListener("touchstart", warmLinkedRoute, true);

    return () => {
      document.removeEventListener("pointerover", warmLinkedRoute, true);
      document.removeEventListener("focusin", warmLinkedRoute, true);
      document.removeEventListener("touchstart", warmLinkedRoute, true);
    };
  }, [routeKey, router]);

  return null;
}
