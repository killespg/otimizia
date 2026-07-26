import Link from "next/link";
import { computeLeadScore } from "@/lib/lead-scoring";
import { getActiveOrgId } from "@/lib/org";
import { getProfessionPreset } from "@/lib/professions";
import { computeStalledDeals } from "@/lib/stalled-deals";
import { createClient } from "@/lib/supabase/server";
import { buildTodayQueue, type TodayItemKind } from "@/lib/today";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconArrowRight, IconBell, IconBuilding, IconCheck, IconClock } from "../icons";

const KIND_META: Record<TodayItemKind, { label: string; icon: (p: { className?: string }) => JSX.Element }> = {
  task_overdue: { label: "Tarefa vencida", icon: IconBell },
  visit_upcoming: { label: "Visita próxima", icon: IconBuilding },
  offer_expiring: { label: "Proposta expirando", icon: IconClock },
  deal_inactive: { label: "Sem contato recente", icon: IconClock },
  deal_no_next_action: { label: "Sem próxima ação", icon: IconCheck },
};

export default async function TodayPage() {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
  ]);
  const orgId = await getActiveOrgId(supabase, user!.id);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  const isRealEstate = workspaceKey === "real_estate_broker";
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const [{ data: overdueTasks }, { data: openDeals }, { data: openTasksWithDeal }, stalledDeals, { data: visits }, { data: offers }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, due_at")
        .eq("org_id", orgId)
        .eq("workspace_key", workspaceKey)
        .eq("done", false)
        .not("due_at", "is", null)
        .lt("due_at", now.toISOString()),
      supabase
        .from("deals")
        .select("id, title")
        .eq("org_id", orgId)
        .eq("workspace_key", workspaceKey)
        .not("stage", "in", "(ganho,perdido)"),
      supabase
        .from("tasks")
        .select("deal_id")
        .eq("org_id", orgId)
        .eq("workspace_key", workspaceKey)
        .eq("done", false)
        .not("deal_id", "is", null),
      computeStalledDeals(supabase, { orgId, ownerId: user!.id }),
      isRealEstate
        ? supabase
            .from("real_estate_visits")
            .select("id, scheduled_at")
            .eq("org_id", orgId)
            .eq("broker_id", user!.id)
            .in("status", ["requested", "scheduled"])
            .not("scheduled_at", "is", null)
            .gte("scheduled_at", now.toISOString())
            .lte("scheduled_at", in24h)
        : Promise.resolve({ data: [] as { id: string; scheduled_at: string }[] }),
      isRealEstate
        ? supabase
            .from("real_estate_offers")
            .select("id, expires_at")
            .eq("org_id", orgId)
            .eq("created_by", user!.id)
            .in("status", ["sent", "viewed"])
            .not("expires_at", "is", null)
            .gte("expires_at", now.toISOString())
            .lte("expires_at", in48h)
        : Promise.resolve({ data: [] as { id: string; expires_at: string }[] }),
    ]);

  const dealIdsWithOpenTask = new Set((openTasksWithDeal ?? []).map((t) => t.deal_id as string));
  const dealsWithoutNextAction = (openDeals ?? []).filter((deal) => !dealIdsWithOpenTask.has(deal.id));

  const queue = buildTodayQueue({
    now,
    overdueTasks: overdueTasks ?? [],
    upcomingVisits: (visits ?? []) as { id: string; scheduled_at: string }[],
    expiringOffers: (offers ?? []) as { id: string; expires_at: string }[],
    stalledDeals,
    dealsWithoutNextAction,
  });

  // 4.3 (Fase 4): lead score (fallback por regra, sem calibração — ver
  // docs/roadmap-imobiliario/4.3-lead-scoring.md) anexado só aos negócios
  // parados, que já trazem etapa e dias de inatividade prontos. Prioridade
  // maior no score não muda a ordem da fila (isso já é 1.3b, bloqueado) —
  // só ajuda o corretor a calibrar o próprio julgamento.
  const stalledDealById = new Map(stalledDeals.map((d) => [d.id, d]));
  const stageForScore = (stage: string): "novo" | "em_contato" | "negociacao" =>
    stage === "em_contato" || stage === "negociacao" ? stage : "novo";
  const queueWithScore = queue.map((item) => {
    if (item.kind !== "deal_inactive") return item;
    const deal = stalledDealById.get(item.id);
    if (!deal) return item;
    const daysSince = Math.round((now.getTime() - new Date(deal.lastActivityAt).getTime()) / 86_400_000);
    const leadScore = computeLeadScore({ daysSinceLastActivity: daysSince, hasOpenNextAction: false, stage: stageForScore(deal.stage) });
    return { ...item, reason: `${item.reason} · Lead score: ${leadScore.score} (confiança baixa)` };
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Central Hoje</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
          O que precisa da sua atenção agora
        </h1>
        <p className="mt-2 text-sm font-medium text-ink-muted">
          Tarefas vencidas, visitas próximas, propostas expirando e {preset.dealPlural} sem próxima ação — tudo numa fila só.
        </p>
      </header>

      {queueWithScore.length === 0 ? (
        <div className="enter rounded-lg border border-dashed border-line bg-[#f8fbff] p-8 text-center">
          <IconCheck className="mx-auto h-8 w-8 text-brand-700" />
          <p className="mt-3 text-base font-black text-ink">Tudo em dia por aqui.</p>
          <p className="mt-1 text-sm font-medium text-ink-muted">
            Nenhuma tarefa vencida, visita próxima ou {preset.dealSingular} parado agora.
          </p>
        </div>
      ) : (
        <ol className="enter space-y-2">
          {queueWithScore.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={item.href}
                  className="press-sm flex items-center gap-3 rounded-lg border border-line bg-white p-4 transition-colors duration-150 ease-out hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warning-50 text-warning-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-safe truncate text-sm font-black text-ink">{item.title}</p>
                    <p className="mt-0.5 text-xs font-bold text-ink-muted">
                      {meta.label} · {item.reason}
                    </p>
                  </div>
                  <IconArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
