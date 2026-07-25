"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function DashboardNavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startedAt = useRef<number | null>(null);
  const [pending, setPending] = useState(false);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const locationKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    const begin = (event: PointerEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href^="/painel"]');
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const next = new URL(anchor.href, window.location.href);
      if (`${next.pathname}?${next.searchParams.toString()}` === locationKey) return;
      startedAt.current = performance.now();
      setPending(true);
    };

    document.addEventListener("pointerdown", begin, true);
    return () => document.removeEventListener("pointerdown", begin, true);
  }, [locationKey]);

  useEffect(() => {
    if (startedAt.current === null) return;
    const duration = Math.round(performance.now() - startedAt.current);
    startedAt.current = null;
    setLastDuration(duration);
    setPending(false);
  }, [locationKey]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden transition-opacity duration-150 ${pending ? "opacity-100" : "opacity-0"}`}
      >
        <span className="block h-full w-4/5 origin-left animate-[dashboard-navigation_900ms_cubic-bezier(.16,1,.3,1)_both] bg-violet-400" />
      </div>
      <output data-testid="dashboard-navigation-timing" className="sr-only" aria-hidden="true">
        {lastDuration === null ? "idle" : String(lastDuration)}
      </output>
    </>
  );
}
