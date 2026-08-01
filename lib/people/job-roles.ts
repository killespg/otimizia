import { LAW_JOB_ROLES } from "@/lib/law/law-office";
import { REAL_ESTATE_JOB_ROLES } from "@/lib/real-estate/real-estate";
import type { WorkspaceKey } from "@/lib/workspace/workspaces";
import type { JobRole } from "@/lib/supabase/types";

const GENERIC_JOB_ROLES: { value: JobRole; label: string; description: string }[] = [
  { value: "owner", label: "Sócio(a) administrador(a)", description: "Acesso total, equipe e configurações." },
  { value: "staff", label: "Colaborador(a)", description: "Acesso básico ao CRM." },
];

// Um org pode ter membros em verticais diferentes (ex: alguém no vertical
// imobiliário, outro no jurídico) — por isso recebe o workspaceKey do
// membro específico, não o de quem está logado.
export function jobRolesFor(workspaceKey: WorkspaceKey | string) {
  if (workspaceKey === "law_office") return LAW_JOB_ROLES;
  if (workspaceKey === "real_estate_broker") return REAL_ESTATE_JOB_ROLES;
  return GENERIC_JOB_ROLES;
}

// União de todos os cargos conhecidos por qualquer vertical — usada só como
// defesa em profundidade na validação de formulário; o check da coluna no
// banco (organization_members_job_role_check) é a autoridade real.
export const ALL_KNOWN_JOB_ROLES = [...LAW_JOB_ROLES, ...REAL_ESTATE_JOB_ROLES, ...GENERIC_JOB_ROLES];
