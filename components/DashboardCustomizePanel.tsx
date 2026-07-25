"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardPreferencesForm } from "@/components/DashboardPreferencesForm";
import type { DashboardPreferences } from "@/lib/dashboard-preferences";
import type { ProfessionPreset } from "@/lib/professions";
import { IconCheck, IconSettings } from "@/app/(dashboard)/painel/icons";

type DashboardCustomizePanelProps = {
  preferences: DashboardPreferences;
  preset: ProfessionPreset;
  action: (formData: FormData) => void | Promise<void>;
};

export function DashboardCustomizePanel({
  preferences,
  preset,
  action,
}: DashboardCustomizePanelProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const isSeller = preset.key === "autonomous_seller";

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("dashboard-edit-mode", { detail: { enabled: open } })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("dashboard-edit-mode", { detail: { enabled: false } })
      );
    };
  }, [open]);

  return (
    <div className={isSeller ? "flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-end sm:justify-between" : "dashboard-customize-header"}>
      <div>
        <p className={isSeller ? "text-xs font-semibold text-od-text-2" : "dashboard-section-eyebrow"}>Área de trabalho</p>
        <h2 className={isSeller ? "mt-1 text-sm font-semibold text-white" : "dashboard-customize-title"}>{isSeller ? "Visão geral de vendas" : "Visão geral do escritório"}</h2>
      </div>
      <details
        ref={detailsRef}
        className={isSeller ? "group relative" : "dashboard-customize"}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className={isSeller ? "flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-white/[0.1] px-3 text-xs font-semibold text-white/60 hover:bg-white/[0.04] hover:text-white" : "dashboard-customize-trigger"}>
        {open ? <IconCheck className="h-4 w-4" /> : <IconSettings className="h-4 w-4" />}
        <span>{open ? "Fechar editor" : "Personalizar painel"}</span>
      </summary>
      <div className={isSeller ? "mt-3 w-full rounded-xl border border-white/[0.09] bg-[#1e1d22] p-4 shadow-2xl sm:absolute sm:right-0 sm:top-10 sm:z-50 sm:min-w-[640px] sm:p-5 lg:min-w-[760px]" : "dashboard-customize-panel"}>
        <div className={isSeller ? "mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between" : "dashboard-customize-header"}>
          <div>
            <p className={isSeller ? "text-xs font-semibold text-od-text-2" : "dashboard-customize-eyebrow"}>Modo de edição</p>
            <h2 className={isSeller ? "mt-1 text-od-subtitle text-white" : "dashboard-customize-title"}>Deixe o painel do seu jeito</h2>
            <p className={isSeller ? "mt-1 text-xs leading-relaxed text-white/44" : "dashboard-customize-description"}>Escolha a aparência, o fundo e as métricas. Para reorganizar os blocos, use as alças no painel abaixo.</p>
          </div>
          <span className={isSeller ? "inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-300" : "dashboard-customize-live"}><span className={isSeller ? "size-1.5 rounded-full bg-emerald-400" : undefined} />Prévia ao vivo</span>
        </div>
          <DashboardPreferencesForm
            preferences={preferences}
            preset={preset}
            action={action}
            returnTo="/painel"
          />
        </div>
      </details>
    </div>
  );
}
