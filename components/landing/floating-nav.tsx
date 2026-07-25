import * as React from "react";
import { LogoWordmarkAdaptive } from "@/components/design-system/logo";

const links = ["Recursos", "Como funciona", "Casos de uso"];

/** Pill-shaped, blurred floating nav bar for marketing surfaces. */
export function FloatingNav() {
  return (
    <div className="flex justify-center rounded-xl bg-od-muted-surface px-3 py-5">
      <div className="flex items-center gap-7 rounded-4xl border border-od-border bg-white/70 py-2.5 pl-5 pr-2.5 shadow-od-float backdrop-blur-2xl dark:bg-white/10">
        <LogoWordmarkAdaptive height={18} />
        {links.map((link) => (
          <span key={link} className="text-[13px] text-od-text-2">
            {link}
          </span>
        ))}
        <span className="rounded-4xl bg-od-accent px-[18px] py-2 text-[13px] font-semibold text-white">
          Criar conta
        </span>
      </div>
    </div>
  );
}
