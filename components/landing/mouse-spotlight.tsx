"use client";

import * as React from "react";

/**
 * Page-wide pointlight — a soft purple glow that follows the cursor across
 * the whole page, not just a single card. Fixed to the viewport (not the
 * document), so it tracks the mouse regardless of scroll position, and uses
 * `mix-blend-mode: screen` so it only ever lightens — never washes out text.
 */
export function MouseSpotlight() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40"
      style={{
        ["--mx" as string]: "50%",
        ["--my" as string]: "20%",
        background:
          "radial-gradient(500px circle at var(--mx) var(--my), rgba(167,139,250,0.07), transparent 80%)",
        mixBlendMode: "screen",
      }}
    />
  );
}
