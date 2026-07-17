import type { JobRole } from "@/lib/supabase/types";

// 3.4 (Fase 3): permissões granulares. Matriz de capacidade por
// job_role/recurso/ação/escopo — espelha exatamente a função SQL
// can_manage_crm_resource() em 0076_granular_rbac.sql. Mantenha as duas em
// sincronia manual (mesmo padrão já usado entre lib/real-estate.ts e
// can_view_realestate()/can_manage_realestate() em 0051).
export type CrmResource = "contact" | "deal" | "task";
export type CrmAction = "view" | "manage";

// Cargos com gestão ampla (qualquer registro da organização). Fora dessa
// lista, só quem é o próprio responsável (assignee/owner) do registro
// pode gerenciar — "escopo próprio", não "escopo equipe" (esse último não
// existe ainda: delegar por time/departamento é refinamento futuro, não
// coberto por este v1).
const BROAD_MANAGE_ROLES: JobRole[] = ["owner", "broker", "agent", "managing_partner", "lawyer"];

export function canViewCrmResource(): boolean {
  // Ver continua liberado pra todo membro da organização, com ou sem RBAC
  // granular ligado — o roadmap pede escopo em "gerenciar", não em "ver".
  // Mudar isso é fora do escopo desta entrega.
  return true;
}

export function canManageCrmResource(params: {
  isOrgAdmin: boolean;
  jobRole: JobRole | null;
  userId: string;
  assigneeId: string | null;
  ownerId: string;
}): boolean {
  if (params.isOrgAdmin) return true;
  if (params.jobRole && BROAD_MANAGE_ROLES.includes(params.jobRole)) return true;
  return params.userId === params.assigneeId || params.userId === params.ownerId;
}

export function canManage(resource: CrmResource, action: CrmAction, params: Parameters<typeof canManageCrmResource>[0]): boolean {
  if (action === "view") return canViewCrmResource();
  return canManageCrmResource(params);
}
