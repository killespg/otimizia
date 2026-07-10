"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardPreferencesForm } from "@/components/DashboardPreferencesForm";
import type { DashboardPreferences } from "@/lib/dashboard-preferences";
import type { ProfessionPreset } from "@/lib/professions";
import { IconSettings } from "@/app/(app)/icons";

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
      <h2 className="dashboard-customize-title">Seu painel</h2>
      <details
        ref={detailsRef}
        className="dashboard-customize"
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="dashboard-customize-trigger">
          <IconSettings className="h-4 w-4" />
          <span>{open ? "Concluir" : "Personalizar"}</span>
        </summary>
        <div className="dashboard-customize-panel">
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
