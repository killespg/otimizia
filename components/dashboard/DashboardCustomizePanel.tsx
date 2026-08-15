"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardPreferencesForm } from "@/components/dashboard/DashboardPreferencesForm";
import type { DashboardPreferences } from "@/lib/workspace/dashboard-preferences";
import type { ProfessionPreset } from "@/lib/people/professions";
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
    <div className="flex flex-col gap-3 border-b border-od-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold text-od-text-2">Área de trabalho</p>
        <h2 className="mt-1 text-sm font-semibold text-od-text">{preset.key === "autonomous_seller" ? "Visão geral de vendas" : "Visão geral do escritório"}</h2>
      </div>
      <details
        ref={detailsRef}
        className="group relative"
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-[var(--radius-control)] border border-od-border bg-od-surface px-3 text-xs font-semibold text-od-text-2 transition-colors hover:border-od-border-hover hover:bg-od-surface-hover hover:text-od-text">
        {open ? <IconCheck className="h-4 w-4" /> : <IconSettings className="h-4 w-4" />}
        <span>{open ? "Fechar editor" : "Personalizar painel"}</span>
      </summary>
      <div className="mt-3 w-full rounded-[var(--radius-panel)] border border-od-border bg-od-muted-surface p-4 sm:absolute sm:right-0 sm:top-11 sm:z-[var(--z-dropdown)] sm:min-w-[640px] sm:p-5 lg:min-w-[760px]">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-od-text-2">Modo de edição</p>
            <h2 className="mt-1 text-od-subtitle text-od-text">Deixe o painel do seu jeito</h2>
            <p className="mt-1 text-xs leading-relaxed text-od-text-3">Escolha a aparência e as métricas. Para reorganizar os blocos, use as alças no painel abaixo.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" />Prévia ao vivo</span>
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
