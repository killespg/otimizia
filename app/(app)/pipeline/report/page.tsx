import Link from "next/link";
import { buildMonthlyDealStats } from "@/lib/deals-report";
import { formatBRL } from "@/lib/format";
import { getActiveOrgId } from "@/lib/org";
import { getProfessionPreset } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import type { Deal } from "@/lib/supabase/types";
import { getWorkspaceLabels } from "@/lib/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconArrowRight, IconDownload } from "../../icons";

const MONTHS_BACK = 6;

export default async function PipelineReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ months?: string }>;
}) {
  const monthsBack = clampMonths((await searchParams)?.months);
  const supabase = createClient();
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
    <div className="max-w-5xl space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
            Voltar para {workspaceLabels.pipeline}
          </Link>
          <h1 className="mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink">
            Relatório de vendas
          </h1>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
            {workspaceLabels.pipeline} por mês — criados, ganhos, perdidos e taxa de conversão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <label className="sr-only" htmlFor="months">
              Período
            </label>
            <select
              id="months"
              name="months"
              defaultValue={String(monthsBack)}
              className="field !w-auto"
            >
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Últimos 12 meses</option>
            </select>
            <button type="submit" className="btn-soft">
              Aplicar
            </button>
          </form>
          <a
            href={`/api/reports/deals?months=${monthsBack}`}
            className="btn-soft inline-flex items-center gap-1.5"
          >
            <IconDownload className="h-4 w-4" />
            Exportar CSV
          </a>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <MetricCard label="Negócios criados" value={String(totals.created)} />
        <MetricCard label="Ganhos" value={String(totals.won)} />
        <MetricCard label="Valor ganho" value={formatBRL(totals.wonValueCents)} />
        <MetricCard
          label="Taxa de conversão"
          value={overallConversion !== null ? `${overallConversion}%` : "—"}
        />
      </section>

      <section className="panel overflow-x-auto p-5 sm:p-6">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-muted">
              <th className="border-b border-line pb-2">Mês</th>
              <th className="border-b border-line pb-2">Criados</th>
              <th className="border-b border-line pb-2">Ganhos</th>
              <th className="border-b border-line pb-2">Perdidos</th>
              <th className="border-b border-line pb-2">Valor ganho</th>
              <th className="border-b border-line pb-2">Conversão</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((m) => (
              <tr key={m.monthKey}>
                <td className="border-b border-line py-2 font-bold text-ink">{m.monthLabel}</td>
                <td className="border-b border-line py-2 text-ink-soft">{m.created}</td>
                <td className="border-b border-line py-2 text-ink-soft">{m.won}</td>
                <td className="border-b border-line py-2 text-ink-soft">{m.lost}</td>
                <td className="border-b border-line py-2 text-ink-soft">{formatBRL(m.wonValueCents)}</td>
                <td className="border-b border-line py-2 text-ink-soft">
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-ink">{value}</p>
    </div>
  );
}
