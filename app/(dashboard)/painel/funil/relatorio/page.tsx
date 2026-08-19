import Link from "next/link";
import { buildMonthlyDealStats } from "@/lib/crm/deals-report";
import { formatBRL } from "@/lib/utils/format";
import { getActiveOrgId } from "@/lib/workspace/org";
import { getProfessionPreset } from "@/lib/people/professions";
import { createClient } from "@/lib/supabase/server";
import type { Deal } from "@/lib/supabase/types";
import { getWorkspaceLabels } from "@/lib/workspace/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconArrowRight, IconDownload } from "../../icons";

const MONTHS_BACK = 6;

export default async function PipelineReportPage(
  props: {
    searchParams?: Promise<{ months?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const monthsBack = clampMonths(searchParams?.months);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [{ data: profile }, { data: org }] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user!.id).maybeSingle(),
    supabase.from("organizations").select("workspace_preferences").eq("id", orgId).maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  const workspaceLabels = getWorkspaceLabels(preset, org?.workspace_preferences, workspaceKey);
  const isSeller = workspaceKey === "autonomous_seller";
  const isRealEstate = workspaceKey === "real_estate_broker";
  const usesFlatSurface = isSeller || isRealEstate;

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .or(`created_at.gte.${from.toISOString()},closed_at.gte.${from.toISOString()}`);
  const deals = (data ?? []) as Deal[];

  const stats = buildMonthlyDealStats(deals, from, to);
  const totals = stats.reduce(
    (acc, m) => ({
      created: acc.created + m.created,
      won: acc.won + m.won,
      lost: acc.lost + m.lost,
      wonValueCents: acc.wonValueCents + m.wonValueCents,
    }),
    { created: 0, won: 0, lost: 0, wonValueCents: 0 }
  );
  const overallConversion =
    totals.won + totals.lost > 0 ? Math.round((totals.won / (totals.won + totals.lost)) * 100) : null;

  return (
    <div className={usesFlatSurface ? "w-full max-w-[1640px] space-y-6" : "max-w-5xl space-y-4 sm:space-y-5"}>
      <header className={usesFlatSurface ? "flex flex-col gap-5 pb-5 lg:flex-row lg:items-end lg:justify-between" : "enter flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between"}>
        <div>
          <Link
            href="/painel/funil"
            className={usesFlatSurface ? "inline-flex items-center gap-1.5 text-xs font-semibold text-od-text-2 hover:text-od-text" : "inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink"}
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
            {isRealEstate ? "Voltar para atendimentos" : `Voltar para ${workspaceLabels.pipeline}`}
          </Link>
          <h1 className={usesFlatSurface ? "mt-3 text-od-title text-white" : "mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink"}>
            {isRealEstate ? "Relatório imobiliário" : "Relatório de vendas"}
          </h1>
          <p className={usesFlatSurface ? "mt-2 max-w-xl text-sm leading-relaxed text-white/52" : "mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted"}>
            {isRealEstate
              ? "Atendimentos por mês — iniciados, fechados, perdidos e taxa de conversão."
              : `${workspaceLabels.pipeline} por mês — criados, ganhos, perdidos e taxa de conversão.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="months">
              Período
            </label>
            <select
              id="months"
              name="months"
              defaultValue={String(monthsBack)}
              className={usesFlatSurface ? "field min-h-11 !w-auto" : "field !w-auto"}
            >
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Últimos 12 meses</option>
            </select>
            <button type="submit" className={usesFlatSurface ? "min-h-11 rounded-md border border-white/[0.1] px-4 text-xs font-semibold text-white/64 hover:bg-white/[0.04] hover:text-white" : "btn-soft"}>
              Aplicar
            </button>
          </form>
          <a
            href={`/api/reports/deals?months=${monthsBack}`}
            className={usesFlatSurface ? "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-od-text-2 hover:bg-white/[0.04] hover:text-od-text" : "btn-soft inline-flex items-center gap-1.5"}
          >
            <IconDownload className="h-4 w-4" />
            Exportar CSV
          </a>
        </div>
      </header>

      <section className={usesFlatSurface ? "od-band grid sm:grid-cols-4" : "grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"}>
        <MetricCard label={isRealEstate ? "Atendimentos iniciados" : "Negócios criados"} value={String(totals.created)} flat={usesFlatSurface} />
        <MetricCard label={isRealEstate ? "Fechados" : "Ganhos"} value={String(totals.won)} flat={usesFlatSurface} />
        <MetricCard label={isRealEstate ? "Valor fechado" : "Valor ganho"} value={formatBRL(totals.wonValueCents)} flat={usesFlatSurface} />
        <MetricCard
          label="Taxa de conversão"
          value={overallConversion !== null ? `${overallConversion}%` : "—"}
          flat={usesFlatSurface}
        />
      </section>

      <section className={usesFlatSurface ? "overflow-x-auto border-t border-white/[0.08]" : "panel overflow-x-auto p-5 sm:p-6"}>
        <table className={usesFlatSurface ? "w-full min-w-[680px] border-collapse text-sm" : "w-full min-w-[560px] border-collapse text-sm"}>
          <thead>
            <tr className={usesFlatSurface ? "text-left text-xs font-semibold uppercase tracking-[0.04em] text-od-text-3" : "text-left text-xs font-bold uppercase tracking-wide text-ink-muted"}>
              <th className={usesFlatSurface ? "border-b border-white/[0.08] px-4 py-3" : "border-b border-line pb-2"}>Mês</th>
              <th className={usesFlatSurface ? "border-b border-white/[0.08] px-4 py-3" : "border-b border-line pb-2"}>{isRealEstate ? "Iniciados" : "Criados"}</th>
              <th className={usesFlatSurface ? "border-b border-white/[0.08] px-4 py-3" : "border-b border-line pb-2"}>{isRealEstate ? "Fechados" : "Ganhos"}</th>
              <th className={usesFlatSurface ? "border-b border-white/[0.08] px-4 py-3" : "border-b border-line pb-2"}>Perdidos</th>
              <th className={usesFlatSurface ? "border-b border-white/[0.08] px-4 py-3" : "border-b border-line pb-2"}>{isRealEstate ? "Valor fechado" : "Valor ganho"}</th>
              <th className={usesFlatSurface ? "border-b border-white/[0.08] px-4 py-3" : "border-b border-line pb-2"}>Conversão</th>
            </tr>
          </thead>
          <tbody className="od-rows">
            {stats.map((m) => (
              <tr key={m.monthKey}>
                <td className={usesFlatSurface ? "px-4 py-3 font-semibold text-white/86" : "py-2 font-bold text-ink"}>{m.monthLabel}</td>
                <td className={usesFlatSurface ? "px-4 py-3 text-white/54" : "py-2 text-ink-soft"}>{m.created}</td>
                <td className={usesFlatSurface ? "px-4 py-3 text-white/54" : "py-2 text-ink-soft"}>{m.won}</td>
                <td className={usesFlatSurface ? "px-4 py-3 text-white/54" : "py-2 text-ink-soft"}>{m.lost}</td>
                <td className={usesFlatSurface ? "px-4 py-3 text-white/54" : "py-2 text-ink-soft"}>{formatBRL(m.wonValueCents)}</td>
                <td className={usesFlatSurface ? "px-4 py-3 text-white/54" : "py-2 text-ink-soft"}>
                  {m.conversionRate !== null ? `${m.conversionRate}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function clampMonths(raw: string | undefined): number {
  const n = Number(raw);
  if (n === 3 || n === 12) return n;
  return MONTHS_BACK;
}

function MetricCard({ label, value, flat = false }: { label: string; value: string; flat?: boolean }) {
  return (
    <article className={flat ? "border-b border-white/[0.08] px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0" : "panel p-4"}>
      <p className={flat ? "text-xs font-medium text-od-text-3" : "text-xs font-bold uppercase tracking-wide text-ink-muted"}>{label}</p>
      <p className={flat ? "mt-2 text-2xl font-bold tracking-[-0.03em] text-white" : "mt-1 text-xl font-black text-ink"}>{value}</p>
    </article>
  );
}

