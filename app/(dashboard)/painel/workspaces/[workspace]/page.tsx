import { redirect } from "next/navigation";

/**
 * Compatibilidade com links antigos.
 *
 * Esta rota já exibiu uma prévia com indicadores fixos e links que não
 * ativavam o workspace solicitado. A seleção real agora acontece em
 * /painel/workspaces e persiste profession_type antes de abrir o painel.
 */
export default function LegacyWorkspacePreview() {
  redirect("/painel/workspaces");
}
