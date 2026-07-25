import type { ProfessionPreset } from "@/lib/professions";
import type { SellerBusinessProfile } from "@/lib/supabase/types";
import type { WorkspaceKey } from "@/lib/workspaces";

export type WorkspaceLabelKey =
  | "contacts"
  | "pipeline"
  | "value"
  | "followups"
  | "dealSingular";

export type WorkspaceLabels = Record<WorkspaceLabelKey, string>;

export type WorkspacePreferences = {
  labels?: Partial<WorkspaceLabels>;
  sellerOperation?: Pick<
    SellerBusinessProfile,
    "sales_models" | "enabled_modules" | "default_warranty_days" | "low_stock_threshold" | "allow_negative_stock"
  >;
};

export type WorkspacePreferencesByKey = Partial<Record<WorkspaceKey, WorkspacePreferences>>;

const LABEL_KEYS: WorkspaceLabelKey[] = [
  "contacts",
  "pipeline",
  "value",
  "followups",
  "dealSingular",
];

export function getDefaultWorkspaceLabels(
  preset: ProfessionPreset,
  isLivestock = preset.key === "livestock_producer"
): WorkspaceLabels {
  return {
    contacts: isLivestock ? "Sujeitos" : "Contatos",
    pipeline: preset.pipelineLabel,
    value: preset.valueLabel,
    followups: isLivestock ? "Sujeitos para revisar" : "Retornos do dia",
    dealSingular: preset.dealSingular,
  };
}

export function parseWorkspacePreferences(value: unknown): WorkspacePreferencesByKey {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as WorkspacePreferencesByKey;
}

export function getWorkspaceLabels(
  preset: ProfessionPreset,
  preferencesValue: unknown,
  workspaceKey: WorkspaceKey,
  isLivestock = preset.key === "livestock_producer"
): WorkspaceLabels {
  const defaults = getDefaultWorkspaceLabels(preset, isLivestock);
  const preferences = parseWorkspacePreferences(preferencesValue);
  const customLabels = preferences[workspaceKey]?.labels ?? {};

  return LABEL_KEYS.reduce<WorkspaceLabels>(
    (labels, key) => {
      const custom = normalizeLabel(customLabels[key]);
      labels[key] = custom || defaults[key];
      return labels;
    },
    { ...defaults }
  );
}

export function cleanWorkspaceLabel(value: FormDataEntryValue | null): string | undefined {
  const label = normalizeLabel(value);
  return label || undefined;
}

function normalizeLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 40);
}
