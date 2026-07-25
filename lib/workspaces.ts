import {
  ASSIGNABLE_PROFESSION_OPTIONS,
  normalizeProfession,
  type ProfessionType,
} from "@/lib/professions";

export type WorkspaceKey = ProfessionType;

// Fundador (is_admin) sempre cai no workspace "founder", ignorando
// profession_type/profession_types — não escolhe, não pode ser setado via
// formulário (normalizeProfession nunca resolve "founder" a partir de input).
export function getWorkspaceKey(
  profileValue: unknown,
  metadataValue?: unknown,
  isAdmin?: boolean
): WorkspaceKey {
  if (isAdmin) return "founder";
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

// Usa a lista atribuivel, nao a do cadastro: quem ja tem uma profissao
// desativada precisa continuar vendo e alternando pra ela no seletor.
export function getWorkspaceOptions(values: unknown, activeValue: unknown) {
  const enabled = normalizeWorkspaceKeys(values, activeValue);
  return ASSIGNABLE_PROFESSION_OPTIONS.filter((option) =>
    enabled.includes(option.value as WorkspaceKey)
  );
}

export function isWorkspaceEnabled(workspace: WorkspaceKey, values: unknown) {
  return normalizeWorkspaceKeys(values, workspace).includes(workspace);
}
