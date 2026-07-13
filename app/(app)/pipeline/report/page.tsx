import Link from "next/link";
import { PageHeader, SectionCard, StatCard } from "@/components/app-ui";
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
    supabase
      .from("profiles")
      .select("profession_type, is_admin")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("workspace_preferences")
      .eq("id", orgId)
      .maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false,
  );
  const preset = getProfessionPreset(workspaceKey);
  const workspaceLabels = getWorkspaceLabels(
    preset,
    org?.workspace_preferences,
    workspaceKey,
  );

  const now = new Date();
  const from = new Date(
    now.getFullYear(),
    now.getMonth() - (monthsBack - 1),
    1,
  );
  const to = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .or(
      `created_at.gte.${from.toISOString()},closed_at.gte.${from.toISOString()}`,
    );
  const deals = (data ?? []) as Deal[];

  const stats = buildMonthlyDealStats(deals, from, to);
  const totals = stats.reduce(
    (acc, m) => ({
      created: acc.created + m.created,
      won: acc.won + m.won,
      lost: acc.lost + m.lost,
      wonValueCents: acc.wonValueCents + m.wonValueCents,
    }),
    { created: 0, won: 0, lost: 0, wonValueCents: 0 },
  );
  const overallConversion =
    totals.won + totals.lost > 0
      ? Math.round((totals.won / (totals.won + totals.lost)) * 100)
      : null;

  return (
    <div className="max-w-5xl space-y-4 sm:space-y-5">
      <PageHeader
        navigation={
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
            Voltar para {workspaceLabels.pipeline}
          </Link>
        }
        eyebrow="Desempenho comercial"
        title="Relatório de vendas"
        description={`${workspaceLabels.pipeline} por mês — criados, ganhos, perdidos e taxa de conversão.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Negócios criados" value={String(totals.created)} />
        <StatCard label="Ganhos" value={String(totals.won)} tone="success" />
        <StatCard
          label="Valor ganho"
          value={formatBRL(totals.wonValueCents)}
          tone="success"
        />
        <StatCard
          label="Taxa de conversão"
          value={overallConversion !== null ? `${overallConversion}%` : "—"}
        />
      </section>

      <SectionCard title="Evolução mensal" flush className="overflow-x-auto">
        <table className="data-table min-w-[560px] text-sm">
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
                <td className="border-b border-line py-2 font-bold text-ink">
                  {m.monthLabel}
                </td>
                <td className="border-b border-line py-2 text-ink-soft">
                  {m.created}
                </td>
                <td className="border-b border-line py-2 text-ink-soft">
                  {m.won}
                </td>
                <td className="border-b border-line py-2 text-ink-soft">
                  {m.lost}
                </td>
                <td className="border-b border-line py-2 text-ink-soft">
                  {formatBRL(m.wonValueCents)}
                </td>
                <td className="border-b border-line py-2 text-ink-soft">
                  {m.conversionRate !== null ? `${m.conversionRate}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function clampMonths(raw: string | undefined): number {
  const n = Number(raw);
  if (n === 3 || n === 12) return n;
  return MONTHS_BACK;
}
