import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { Panel } from "./panel";

const logos = ["Corretores de imóveis", "Escritórios de advocacia", "Consultores", "Prestadores de serviço", "Pequenos comércios"];

/**
 * Infinite-scrolling logo/text marquee with edge fade, CSS-driven.
 * `bare` drops the card wrapper (border/background) so it can float
 * directly on a page's own background — the edge fade adapts via
 * `fadeColor` since it needs to match whatever sits behind it.
 */
export function LogoMarquee({ bare = false, fadeColor = "var(--od-surface)" }: { bare?: boolean; fadeColor?: string }) {
  const content = (
    <>
      <div className="flex w-max animate-marquee gap-14">
        {[0, 1].map((rep) => (
          <div key={rep} className="flex gap-14" aria-hidden={rep === 1}>
            {logos.map((logo) => (
              <span key={logo} className="whitespace-nowrap text-sm font-bold text-[#c3bcc9]">
                {logo}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(90deg, ${fadeColor}, transparent 8%, transparent 92%, ${fadeColor})`,
        }}
      />
    </>
  );

  if (bare) {
    return <div className="relative overflow-hidden py-5">{content}</div>;
  }

  return <Panel className={cn("relative overflow-hidden py-5")}>{content}</Panel>;
}
