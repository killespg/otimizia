import { normalizeProfession, type ProfessionType } from "@/lib/professions";

export type WorkspaceKey = ProfessionType;

export function getWorkspaceKey(profileValue: unknown, metadataValue?: unknown): WorkspaceKey {
  return normalizeProfession(profileValue ?? metadataValue);
}
