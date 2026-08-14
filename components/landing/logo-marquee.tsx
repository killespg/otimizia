import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { Panel } from "./panel";

const logos = ["Corretores de imóveis", "Escritórios de advocacia", "Consultores", "Prestadores de serviço", "Pequenos comércios"];

/**
 * Static proof strip. It wraps cleanly without motion or decorative fades.
 */
export function LogoMarquee({ bare = false }: { bare?: boolean; fadeColor?: string }) {
  const content = (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
      {logos.map((logo) => (
        <span key={logo} className="whitespace-nowrap text-sm font-semibold text-od-text-2">
          {logo}
        </span>
      ))}
    </div>
  );

  if (bare) {
    return <div className="py-5">{content}</div>;
  }

  return <Panel className={cn("relative overflow-hidden py-5")}>{content}</Panel>;
}
