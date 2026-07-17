import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { IconArrowRight, IconTrash } from "../../icons";
import { createAutomationRule, deleteAutomationRule, toggleAutomationRule } from "../automation-actions";

const TRIGGER_LABELS: Record<string, string> = {
  deal_created: "Negócio criado",
  deal_stage_changed: "Etapa do negócio mudou",
  deal_inactive: "Negócio inativo há N dias",
};
const ACTION_LABELS: Record<string, string> = {
  create_task: "Criar tarefa",
  send_email: "Enviar e-mail",
  change_stage: "Mudar etapa",
};

export default async function AutomationRulesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") redirect("/settings");

  const [{ data: rules }, { data: pipelines }, { data: recentExecutions }] = await Promise.all([
    supabase.from("automation_rules").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("pipelines").select("id, name, workspace_key").eq("org_id", orgId),
    supabase
      .from("automation_executions")
      .select("id, rule_id, status, error_message, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter rounded-lg border border-line bg-surface p-5 sm:p-6">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink">
          <IconArrowRight className="h-4 w-4 rotate-180" />
          Voltar para Configurações
        </Link>
        <h1 className="mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink">
          Automações
        </h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Quando algo acontecer, faça algo automaticamente. Sem simulação contra dados passados
          ainda — crie a regra e acompanhe o histórico de execuções abaixo.
        </p>
      </header>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-black tracking-[-0.02em] text-ink">Nova regra</h2>
        <form action={createAutomationRule} className="mt-4 space-y-3">
          <input name="name" placeholder="Nome da regra (ex: Comemorar fechamento)" maxLength={120} className="field w-full" />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Quando</span>
              <select name="trigger_kind" required className="field w-full" defaultValue="">
                <option value="" disabled>
                  Escolha o gatilho
                </option>
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Então</span>
              <select name="action_type" required className="field w-full" defaultValue="">
                <option value="" disabled>
                  Escolha a ação
                </option>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="label">Pipeline (opcional)</span>
              <select name="pipeline_id" className="field w-full" defaultValue="">
                <option value="">Qualquer</option>
                {(pipelines ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.workspace_key})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Etapa (opcional)</span>
              <select name="stage_key" className="field w-full" defaultValue="">
                <option value="">Qualquer</option>
                <option value="novo">Novo</option>
                <option value="em_contato">Em contato</option>
                <option value="negociacao">Proposta</option>
                <option value="ganho">Ganho</option>
                <option value="perdido">Perdido</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Dias de inatividade</span>
              <input name="inactivity_days" type="number" min={1} defaultValue={5} className="field w-full" />
            </label>
          </div>

          <div className="rounded-lg border border-dashed border-line p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
              Parâmetros da ação — preencha só os que se aplicam à ação escolhida acima
            </p>
            <div className="mt-2 space-y-2">
              <input name="title_template" placeholder="Título da tarefa (ex: Retomar contato — {{deal.title}})" maxLength={200} className="field w-full" />
              <input name="subject_template" placeholder="Assunto do e-mail (ex: Sobre {{deal.title}})" maxLength={160} className="field w-full" />
              <textarea name="body_template" placeholder="Corpo do e-mail" maxLength={2000} rows={2} className="field w-full" />
              <select name="to_stage" className="field w-full" defaultValue="">
                <option value="">Mudar etapa para... (só pra ação &quot;Mudar etapa&quot;)</option>
                <option value="novo">Novo</option>
                <option value="em_contato">Em contato</option>
                <option value="negociacao">Proposta</option>
                <option value="ganho">Ganho</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
          </div>

          <PendingButton className="btn" pendingLabel="Criando">
            Criar regra
          </PendingButton>
        </form>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-black tracking-[-0.02em] text-ink">Regras ativas</h2>
        <ul className="mt-4 space-y-2">
          {(rules ?? []).map((rule) => (
            <li key={rule.id} className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-black text-ink">{rule.name}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <form action={toggleAutomationRule}>
                    <input type="hidden" name="id" value={rule.id} />
                    <input type="hidden" name="active" value={rule.active ? "" : "on"} />
                    <PendingButton className="btn-soft" pendingLabel="Salvando">
                      {rule.active ? "Desativar" : "Ativar"}
                    </PendingButton>
                  </form>
                  <form action={deleteAutomationRule}>
                    <input type="hidden" name="id" value={rule.id} />
                    <PendingButton
                      className="icon-button grid h-9 w-9 place-items-center rounded-md text-ink-muted/60 hover:bg-danger-50 hover:text-danger-600"
                      aria-label={`Excluir regra ${rule.name}`}
                      iconOnly
                      pendingLabel="Excluindo"
                    >
                      <IconTrash className="h-4 w-4" />
                    </PendingButton>
                  </form>
                </div>
              </div>
              <p className="mt-1 text-xs font-semibold text-ink-muted">
                {TRIGGER_LABELS[rule.trigger_kind]} → {ACTION_LABELS[rule.action_type]} ·{" "}
                {rule.active ? "ativa" : "inativa"}
              </p>
            </li>
          ))}
          {(rules ?? []).length === 0 && <li className="text-sm font-medium text-ink-muted">Nenhuma regra criada ainda.</li>}
        </ul>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-black tracking-[-0.02em] text-ink">Histórico recente</h2>
        <ul className="mt-4 space-y-1.5">
          {(recentExecutions ?? []).map((execution) => (
            <li key={execution.id} className="flex items-center justify-between gap-3 text-xs">
              <span
                className={
                  "rounded-md px-1.5 py-0.5 font-black " +
                  (execution.status === "success"
                    ? "bg-success-50 text-success-700"
                    : execution.status === "failed"
                    ? "bg-danger-50 text-danger-700"
                    : "bg-surface-2 text-ink-muted")
                }
              >
                {execution.status}
              </span>
              <span className="flex-1 truncate font-medium text-ink-muted">{execution.error_message || "—"}</span>
              <span className="shrink-0 font-bold text-ink-muted">
                {new Date(execution.created_at).toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
          {(recentExecutions ?? []).length === 0 && (
            <li className="text-sm font-medium text-ink-muted">Nenhuma execução ainda.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
