import type { JobRole, LegalCaseStatus, Receivable } from "@/lib/supabase/types";
import { normalizeWorkspaceKeys } from "@/lib/workspace/workspaces";

export const LAW_JOB_ROLES: { value: JobRole; label: string; description: string }[] = [
  { value: "owner", label: "Sócio(a) administrador(a)", description: "Acesso total, equipe e configurações." },
  { value: "managing_partner", label: "Sócio(a) gestor(a)", description: "Gerencia casos, honorários e a operação." },
  { value: "lawyer", label: "Advogado(a)", description: "Atua em casos, clientes e prazos." },
  { value: "paralegal", label: "Paralegal / assistente jurídico", description: "Apoia casos, documentos e tarefas." },
  { value: "finance", label: "Financeiro", description: "Acessa contratos, recebíveis e pagamentos." },
  { value: "receptionist", label: "Recepção / comercial", description: "Cuida de contatos, triagem e agenda." },
  { value: "intern", label: "Estagiário(a)", description: "Apoia a área jurídica com supervisão." },
  { value: "staff", label: "Colaborador(a)", description: "Acesso básico ao CRM." },
];

export const LEGAL_CASE_STATUS: Record<LegalCaseStatus, string> = {
  intake: "Triagem",
  active: "Em andamento",
  waiting: "Aguardando",
  suspended: "Suspenso",
  closed: "Encerrado",
  archived: "Arquivado",
};

export function jobRoleLabel(role: JobRole | null | undefined) {
  return LAW_JOB_ROLES.find((item) => item.value === role)?.label ?? "Colaborador(a)";
}

export function canViewLegal(role: JobRole | null | undefined, isAdmin = false) {
  return isAdmin || ["owner", "managing_partner", "lawyer", "paralegal", "intern"].includes(role ?? "");
}

/**
 * Primeiro fator de acesso ao jurídico: a workspace precisa estar habilitada
 * para o usuário.
 *
 * `canViewLegal` sozinho não serve como porta: ele libera para qualquer
 * `isAdmin`, e as páginas passam `orgRole === "admin"` — como todo cliente é
 * admin da própria organização, qualquer conta abria /painel/juridico. Um
 * corretor via o dashboard jurídico dentro do shell imobiliário.
 *
 * A checagem é por `profession_types` (plural), não pela workspace ativa: quem
 * é advogado E corretor continua entrando sem precisar alternar antes.
 * `is_admin` aqui é a flag de fundador da plataforma (getWorkspaceKey manda
 * esse perfil para a workspace "founder"), não o cargo dentro da org.
 */
export function hasLegalWorkspace(profile: {
  is_admin?: boolean | null;
  profession_type?: unknown;
  profession_types?: unknown;
}) {
  if (profile.is_admin) return true;
  return normalizeWorkspaceKeys(
    profile.profession_types,
    profile.profession_type,
  ).includes("law_office");
}

export function canManageLegal(role: JobRole | null | undefined, isAdmin = false) {
  return isAdmin || ["owner", "managing_partner", "lawyer", "paralegal"].includes(role ?? "");
}

export function canViewFinance(role: JobRole | null | undefined, isAdmin = false) {
  return isAdmin || ["owner", "managing_partner", "finance"].includes(role ?? "");
}

export function canManageFinance(role: JobRole | null | undefined, isAdmin = false) {
  return isAdmin || ["owner", "managing_partner", "finance"].includes(role ?? "");
}

export function outstandingCents(receivable: Pick<Receivable, "original_cents" | "paid_cents">) {
  return Math.max(0, receivable.original_cents - receivable.paid_cents);
}

export function receivableState(receivable: Pick<Receivable, "status" | "due_date" | "original_cents" | "paid_cents">) {
  if (receivable.status === "paid") return "paid" as const;
  if (receivable.status === "cancelled") return "cancelled" as const;
  if (new Date(`${receivable.due_date}T23:59:59`) < new Date()) return "overdue" as const;
  return receivable.status === "partial" ? "partial" as const : "pending" as const;
}
