"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardPreferencesForm } from "@/components/DashboardPreferencesForm";
import type { DashboardPreferences } from "@/lib/dashboard-preferences";
import type { ProfessionPreset } from "@/lib/professions";
import { IconCheck, IconSettings } from "@/app/(app)/icons";

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
    <div className="dashboard-customize-header">
      <div>
        <p className="dashboard-section-eyebrow">Área de trabalho</p>
        <h2 className="dashboard-customize-title">Visão geral do escritório</h2>
      </div>
      <details
        ref={detailsRef}
        className="dashboard-customize"
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="dashboard-customize-trigger">
        {open ? <IconCheck className="h-4 w-4" /> : <IconSettings className="h-4 w-4" />}
        <span>{open ? "Fechar editor" : "Personalizar painel"}</span>
      </summary>
      <div className="dashboard-customize-panel">
        <div className="dashboard-customize-header">
          <div>
            <p className="dashboard-customize-eyebrow">Modo de edição</p>
            <h2 className="dashboard-customize-title">Deixe o painel do seu jeito</h2>
            <p className="dashboard-customize-description">Escolha a aparência e as métricas. Para reorganizar os blocos, use as alças no painel abaixo.</p>
          </div>
          <span className="dashboard-customize-live"><span />Prévia ao vivo</span>
        </div>
          <DashboardPreferencesForm
            preferences={preferences}
            preset={preset}
            action={action}
            returnTo="/dashboard"
          />
        </div>
      </details>
    </div>
  );
}
