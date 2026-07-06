import {
  PROFESSION_OPTIONS,
  normalizeProfession,
  type ProfessionType,
} from "@/lib/professions";

export type WorkspaceKey = ProfessionType;

export function getWorkspaceKey(profileValue: unknown, metadataValue?: unknown): WorkspaceKey {
  return normalizeProfession(profileValue ?? metadataValue);
}

export function normalizeWorkspaceKeys(values: unknown, fallback?: unknown): WorkspaceKey[] {
  const rawValues = Array.isArray(values) ? values : [];
  const keys = rawValues
    .map((value) => normalizeProfession(value))
    .filter((value, index, arr) => arr.indexOf(value) === index);

  if (keys.length > 0) return keys;
  return [normalizeProfession(fallback)];
}

export function getWorkspaceOptions(values: unknown, activeValue: unknown) {
  const enabled = normalizeWorkspaceKeys(values, activeValue);
  return PROFESSION_OPTIONS.filter((option) =>
    enabled.includes(option.value as WorkspaceKey)
  );
}

export function isWorkspaceEnabled(workspace: WorkspaceKey, values: unknown) {
  return normalizeWorkspaceKeys(values, workspace).includes(workspace);
}
