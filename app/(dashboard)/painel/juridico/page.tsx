import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  FileCheck2,
  FileClock,
  FileSearch,
  RefreshCw,
} from "lucide-react";
import { canViewFinance, canViewLegal } from "@/lib/law-office";
import { formatBRL } from "@/lib/format";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type {
  LegalCase,
  LegalDeadline,
  LegalWatchedProcess,
  Receivable,
} from "@/lib/supabase/types";
import { LegalDashboardAssistant } from "@/components/design-system/legal-dashboard-assistant";
import { LegalDashboardFilters } from "@/components/design-system/legal-dashboard-filters";

type ContactRow = { id: string; name: string };
type PaymentRow = { amount_cents: number; paid_at: string };
type CaseEventRow = { id: string; occurred_at: string };

const CASE_STATUS: Record<LegalCase["status"], string> = {
  intake: "Triagem",
  active: "Em andamento",
  waiting: "Aguardando",
  suspended: "Suspenso",
  closed: "Encerrado",
  archived: "Arquivado",
};

function endOfToday(now: Date) {
  const value = new Date(now);
  value.setHours(23, 59, 59, 999);
  return value;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "bem-vindo";
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortDate(value: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function outstanding(item: Receivable) {
  return Math.max(0, item.original_cents - item.paid_cents);
}

export default async function LegalDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; portfolio?: string; area?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const now = new Date();
  const todayEnd = endOfToday(now);
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    orgRole,
    { data: membership },
    { data: profile },
    members,
    { data: caseRows },
    { data: deadlineRows },
    { data: watchedRows },
    { data: receivableRows },
    { data: contactRows },
    { data: paymentRows },
    { data: eventRows },
  ] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase.from("profiles").select("name").eq("id", user!.id).maybeSingle(),
    getOrgMembers(supabase, orgId),
    supabase
      .from("legal_cases")
      .select("*")
      .eq("org_id", orgId)
      .order("next_deadline_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("legal_deadlines")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("due_at", { ascending: true }),
    supabase
      .from("legal_watched_processes")
      .select("*")
      .eq("org_id", orgId)
      .order("last_movement_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("receivables")
      .select("*")
      .eq("org_id", orgId)
      .order("due_date", { ascending: true }),
    supabase
      .from("contacts")
      .select("id,name")
      .eq("org_id", orgId)
      .eq("workspace_key", "law_office"),
    supabase
      .from("receivable_payments")
      .select("amount_cents,paid_at")
      .eq("org_id", orgId)
      .gte("paid_at", monthStart.toISOString()),
    supabase
      .from("legal_case_events")
      .select("id,occurred_at")
      .eq("org_id", orgId)
      .gte(
        "occurred_at",
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString(),
      ),
  ]);

  const isAdmin = orgRole === "admin";
  if (!canViewLegal(membership?.job_role, isAdmin)) {
    return (
      <section className="rounded-xl border border-od-border bg-od-surface p-6">
        <h1 className="text-xl font-semibold">Acesso jurídico restrito</h1>
        <p className="mt-2 text-sm text-white/55">
          Peça a um administrador do escritório para revisar seu cargo.
        </p>
      </section>
    );
  }

  const cases = (caseRows ?? []) as LegalCase[];
  const deadlines = (deadlineRows ?? []) as LegalDeadline[];
  const watched = (watchedRows ?? []) as LegalWatchedProcess[];
  const receivables = (receivableRows ?? []) as Receivable[];
  const contacts = (contactRows ?? []) as ContactRow[];
  const payments = (paymentRows ?? []) as PaymentRow[];
  const events = (eventRows ?? []) as CaseEventRow[];
  const contactNames = new Map(
    contacts.map((contact) => [contact.id, contact.name]),
  );
  const memberNames = new Map(
    members.map((member) => [member.user_id, member.name || "Sem nome"]),
  );
  const caseById = new Map(cases.map((item) => [item.id, item]));

  const allActiveCases = cases.filter((item) =>
    ["intake", "active", "waiting", "suspended"].includes(item.status),
  );
  const period = filters?.period === "30" ? "30" : "7";
  const portfolio = filters?.portfolio === "team" ? "team" : "mine";
  const areas = Array.from(new Set(allActiveCases.map((item) => item.area).filter(Boolean))) as string[];
  const area = filters?.area && areas.includes(filters.area) ? filters.area : "all";
  const activeCases = allActiveCases.filter((item) =>
    (portfolio === "team" || item.responsible_id === user!.id) &&
    (area === "all" || item.area === area),
  );
  const activeCaseIds = new Set(activeCases.map((item) => item.id));
  const periodEnd = new Date(now.getTime() + Number(period) * 86_400_000);
  const visibleDeadlines = deadlines.filter(
    (item) => activeCaseIds.has(item.case_id) && new Date(item.due_at) <= periodEnd,
  );
  const critical = visibleDeadlines.filter(
    (item) => new Date(item.due_at) <= todayEnd,
  );
  const weekDeadlines = visibleDeadlines.filter(
    (item) => new Date(item.due_at) <= weekEnd,
  );
  const stalled = activeCases.filter(
    (item) => new Date(item.updated_at) < thirtyDaysAgo,
  );
  const reviews = watched.filter(
    (item) =>
      (!item.case_id || activeCaseIds.has(item.case_id)) &&
      item.last_movement_at &&
      (!item.seen_at ||
        new Date(item.last_movement_at) > new Date(item.seen_at)),
  );
  const openReceivables = receivables.filter(
    (item) => item.status === "pending" || item.status === "partial",
  );
  const overdueReceivables = openReceivables.filter(
    (item) => new Date(`${item.due_date}T23:59:59`) < now,
  );
  const overdueCents = overdueReceivables.reduce(
    (sum, item) => sum + outstanding(item),
    0,
  );
  const openCents = openReceivables.reduce(
    (sum, item) => sum + outstanding(item),
    0,
  );
  const paidThisMonth = payments.reduce(
    (sum, item) => sum + item.amount_cents,
    0,
  );
  const collectionTarget = Math.max(openCents + paidThisMonth, 1);
  const collectionProgress = Math.min(
    100,
    Math.round((paidThisMonth / collectionTarget) * 100),
  );
  const displayName =
    profile?.name ||
    (typeof user?.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null) ||
    user?.email?.split("@")[0] ||
    "bem-vindo";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const priorityItems = visibleDeadlines.slice(0, 2);
  const tableCases = activeCases.slice(0, 6);

  // Tres estados diferentes, nao um "vazio" so. Escritorio sem nenhum caso
  // precisa aprender a area; escritorio com a carteira em dia precisa ouvir que
  // esta em dia. Colapsar os dois em "Nenhuma prioridade encontrada" era o que
  // fazia a tela nao dizer nada.
  const hasAnyCase = allActiveCases.length > 0;
  const hasSignals = critical.length > 0 || reviews.length > 0;
  // Quantos prazos pendentes existem FORA do escopo atual (periodo, carteira,
  // area). Se houver, o vazio nao e "nada pra fazer" — e "nada aqui", e vale
  // oferecer a ampliacao em vez de deixar o usuario achar que zerou.
  const deadlinesOutOfScope = deadlines.length - visibleDeadlines.length;

  return (
    <div id="carteira" className="mx-auto w-full max-w-[1640px] text-white">
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold text-violet-300">
            <CalendarDays size={16} />
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
          </p>
          <h1 className="mt-2 text-od-title font-extrabold tracking-[-0.02em]">
            Bom dia,{" "}
            <span className="text-violet-300">{firstName(displayName)}.</span>
          </h1>
          {/* Cor de estado só aparece quando existe estado. Vermelho sobre um
              zero era alarme anunciando que não há nada de errado — e era o
              único ponto forte de cor da tela. */}
          {!hasAnyCase ? (
            <p className="mt-2 max-w-3xl text-sm text-white/60">
              Seu escritório ainda não tem casos cadastrados. Comece por um caso
              e o painel passa a mostrar prazos, movimentações e honorários.
            </p>
          ) : hasSignals ? (
            <p className="mt-2 flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/60">
              <span>O escritório começa o dia com</span>
              {critical.length > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#fca79b]">
                  <AlertTriangle size={14} />
                  {critical.length}{" "}
                  {critical.length === 1 ? "prazo crítico" : "prazos críticos"}
                </span>
              ) : null}
              {critical.length > 0 && reviews.length > 0 ? (
                <span className="text-white/35">e</span>
              ) : null}
              {reviews.length > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-violet-200">
                  <FileCheck2 size={14} />
                  {reviews.length}{" "}
                  {reviews.length === 1 ? "movimentação" : "movimentações"} para
                  revisar.
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 flex max-w-3xl flex-wrap items-center gap-x-1.5 text-sm text-white/60">
              <Check size={15} className="mt-1 shrink-0 text-emerald-300/80" />
              <span>
                Nenhum prazo crítico e nenhuma movimentação pendente.{" "}
                <span className="text-white/45">
                  {allActiveCases.length}{" "}
                  {allActiveCases.length === 1
                    ? "caso ativo na carteira"
                    : "casos ativos na carteira"}
                  .
                </span>
              </span>
            </p>
          )}
        </div>
        {/* Sem caso nenhum não há o que filtrar: três seletores desabilitados
            de fato só somam moldura no dia um. */}
        {hasAnyCase ? (
          <LegalDashboardFilters period={period} portfolio={portfolio} area={area} areas={areas} />
        ) : null}
      </section>

      <div className="space-y-6">
        <LegalDashboardAssistant
          suggestions={[
            "Quais casos vencem essa semana?",
            "Resuma a carteira atual",
            "Quem está com honorário atrasado?",
          ]}
        />

        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">
                {hasAnyCase ? "Prioridades de hoje" : "Como o jurídico funciona"}
              </h2>
              <p className="mt-1 text-xs text-white/60">
                {!hasAnyCase
                  ? "Três passos e o painel começa a trabalhar por você"
                  : priorityItems.length === 1
                    ? "Um item exige ação do escritório"
                    : priorityItems.length > 0
                      ? `${priorityItems.length} itens exigem ação do escritório`
                      : "Carteira em dia no período selecionado"}
              </p>
            </div>
            {hasAnyCase ? (
              <Link
                href="/painel/juridico/prazos"
                className="shrink-0 text-xs font-semibold text-violet-300 hover:text-violet-200"
              >
                Ver meu dia
              </Link>
            ) : null}
          </div>
          {/* O cabeçalho de coluna vive DENTRO do caso com linhas. Fora dele,
              prometia cinco colunas e entregava uma frase centralizada. */}
          {priorityItems.length ? (
            <div className="hidden grid-cols-[128px_minmax(0,1.2fr)_minmax(150px,.8fr)_110px_120px_32px] gap-x-3 px-3 pb-2 text-od-label text-white/35 sm:grid">
              <span>Prioridade</span>
              <span>Caso</span>
              <span>Próxima ação</span>
              <span>Área</span>
              <span>Responsável</span>
              <span />
            </div>
          ) : null}
          {priorityItems.length ? (
            <div className="divide-y divide-od-border border-y border-od-border">
              {priorityItems.map((deadline) => {
                const item = caseById.get(deadline.case_id);
                const urgent = new Date(deadline.due_at) <= todayEnd;
                const PriorityIcon = urgent ? AlertTriangle : FileSearch;
                const owner = deadline.assigned_to
                  ? memberNames.get(deadline.assigned_to) || "Sem nome"
                  : "Equipe";
                return (
                  <Link
                    key={deadline.id}
                    href={`/painel/juridico/processos/${deadline.case_id}`}
                    className="grid min-h-[68px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-3 hover:bg-white/[0.025] sm:grid-cols-[128px_minmax(0,1.2fr)_minmax(150px,.8fr)_110px_120px_32px]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-xl ${urgent ? "bg-red-400/10 text-[#fb7767]" : "bg-violet-400/10 text-violet-300"}`}
                      >
                        <PriorityIcon size={14} />
                      </span>
                      <span className="hidden min-w-0 sm:block">
                        <strong
                          className={`block text-od-label ${urgent ? "text-[#fca79b]" : "text-violet-300"}`}
                        >
                          {urgent ? "Crítico" : "Revisão"}
                        </strong>
                        <small className="mt-0.5 block truncate text-xs font-semibold text-white/75">
                          {dateTime(deadline.due_at)}
                        </small>
                      </span>
                    </div>
                    <span className="min-w-0">
                      <strong className="block truncate text-[13px] font-semibold leading-snug">
                        {item?.title || "Caso jurídico"}
                      </strong>
                      <small className="mt-1 block truncate text-xs text-white/55 sm:hidden">
                        {deadline.title}
                      </small>
                    </span>
                    <span className="hidden truncate text-xs text-white/60 sm:block">
                      {deadline.title}
                    </span>
                    <span className="hidden text-xs text-white/55 sm:block">
                      {item?.area || "Não informada"}
                    </span>
                    <span className="hidden items-center gap-2 text-xs text-white/65 sm:flex">
                      <span className="grid size-5 place-items-center rounded-full bg-white/[0.08] text-[9px] font-bold text-white/70">
                        {owner.charAt(0)}
                      </span>
                      {owner}
                    </span>
                    <Check
                      size={15}
                      className="hidden text-white/40 sm:block"
                    />
                  </Link>
                );
              })}
            </div>
          ) : hasAnyCase ? (
            /* Carteira em dia: boa notícia dita como boa notícia. Se existem
               prazos fora do escopo atual, dizemos quantos — senão o usuário
               conclui que zerou quando só está olhando por uma fresta. */
            <div className="flex flex-col gap-3 border-y border-od-border px-3 py-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2.5 text-sm text-white/70">
                <span className="mt-px grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <Check size={15} />
                </span>
                <span>
                  Nada vence {period === "7" ? "nos próximos 7 dias" : "nos próximos 30 dias"}
                  {portfolio === "mine" ? " na sua carteira" : " na carteira do escritório"}
                  {area === "all" ? "" : ` em ${area}`}.
                  {deadlinesOutOfScope > 0 ? (
                    <span className="mt-1 block text-white/45">
                      {deadlinesOutOfScope}{" "}
                      {deadlinesOutOfScope === 1
                        ? "prazo pendente fica fora deste filtro"
                        : "prazos pendentes ficam fora deste filtro"}
                      .
                    </span>
                  ) : null}
                </span>
              </p>
              <Link
                href="/painel/juridico/prazos"
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-od-border px-4 text-[13px] font-semibold text-white/80 hover:border-white/25 hover:text-white"
              >
                Ver todos os prazos
                <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : (
            /* Dia um: ensina a área em vez de dizer "nada aqui". Numerado
               porque é uma sequência de verdade — cada passo destrava o
               seguinte. */
            <ol className="divide-y divide-od-border border-y border-od-border">
              {[
                {
                  step: "1",
                  title: "Cadastre um caso",
                  body: "Cliente, área, responsável e o próximo prazo. É o que alimenta todo o resto do painel.",
                  href: "/painel/juridico/processos",
                  action: "Novo caso",
                  Icon: FileCheck2,
                },
                {
                  step: "2",
                  title: "Puxe o processo do DataJud",
                  body: "Pelo número do processo, o OtimizIA importa as partes e o histórico em vez de você digitar.",
                  href: "/painel/juridico/consulta",
                  action: "Consultar",
                  Icon: FileSearch,
                },
                {
                  step: "3",
                  title: "Deixe o Tim vigiar os prazos",
                  body: "Movimentação nova e prazo chegando aparecem aqui, e o assistente avisa antes de virar urgência.",
                  href: "/painel/juridico/prazos",
                  action: "Ver prazos",
                  Icon: FileClock,
                },
              ].map(({ step, title, body, href, action, Icon }) => (
                <li
                  key={step}
                  className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-od-accent/12 text-[13px] font-bold text-violet-300">
                    {step}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="flex items-center gap-2 text-[13px] font-semibold text-white">
                      <Icon size={14} className="shrink-0 text-white/40" />
                      {title}
                    </strong>
                    <span className="mt-1 block max-w-[62ch] text-xs leading-5 text-white/55">
                      {body}
                    </span>
                  </span>
                  <Link
                    href={href}
                    className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md px-4 text-[13px] font-semibold transition-colors ${
                      step === "1"
                        ? "bg-od-accent text-white hover:bg-od-accent-hover"
                        : "border border-od-border text-white/80 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {action}
                    <ArrowUpRight size={14} />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section id="movimentacoes">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold">Panorama operacional</h2>
              <p className="mt-1 text-xs text-white/60">
                O que precisa de decisão no escritório agora
              </p>
            </div>
            <span className="text-xs font-medium text-white/50">
              Atualizado agora
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={AlertTriangle}
              label="Prazos críticos"
              value={String(critical.length)}
              detail="vencem hoje"
              context={`${weekDeadlines.length} nos próximos 7 dias`}
              href="/painel/juridico/prazos"
              action="Ver prazos"
              tone="danger"
            />
            <StatCard
              icon={FileClock}
              label="Casos sem movimento"
              value={String(stalled.length)}
              detail="há mais de 30 dias"
              context="exigem contato"
              href="/painel/juridico/processos"
              action="Ver casos"
              tone="warning"
            />
            <StatCard
              icon={RefreshCw}
              label="Pendências processuais"
              value={String(reviews.length)}
              detail="aguardam revisão"
              context={`${events.length} movimentações hoje`}
              href="/painel/juridico/consulta"
              action="Revisar"
              tone="brand"
            />
            {canViewFinance(membership?.job_role, isAdmin) ? (
              <StatCard
                icon={CircleDollarSign}
                label="Valores vencidos"
                value={formatBRL(overdueCents)}
                detail={`${overdueReceivables.length} cobranças abertas`}
                context="ação financeira"
                href="/painel/financeiro#recebiveis"
                action="Ver cobranças"
                tone="danger"
              />
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,.72fr)]">
          <PortfolioChart cases={cases} />
          {canViewFinance(membership?.job_role, isAdmin) ? (
            <FinanceSummary
              progress={collectionProgress}
              paid={paidThisMonth}
              overdue={overdueCents}
              open={openCents}
              count={openReceivables.length}
            />
          ) : (
            <div className="rounded-xl border border-od-border bg-od-surface p-5">
              <h2 className="text-base font-semibold">
                Carteira do escritório
              </h2>
              <p className="mt-2 text-sm text-white/50">
                {activeCases.length} casos ativos sob acompanhamento.
              </p>
            </div>
          )}
        </section>

        <CasesTable
          cases={tableCases}
          total={activeCases.length}
          contacts={contactNames}
          members={memberNames}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  context,
  href,
  action,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  detail: string;
  context: string;
  href: string;
  action: string;
  tone: "danger" | "warning" | "brand";
}) {
  const color =
    tone === "danger"
      ? "text-[#fb7767]"
      : tone === "warning"
        ? "text-amber-300"
        : "text-violet-300";
  return (
    <article className="min-w-0 rounded-xl border border-od-border bg-od-surface p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className={`shrink-0 ${color}`} strokeWidth={2} />
        <span className="text-xs font-semibold text-white/65">{label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong className="text-2xl font-bold tracking-[-.02em]">
          {value}
        </strong>
        <span className={`text-xs font-semibold ${color}`}>{detail}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
        <span className="text-xs text-white/50">{context}</span>
        <Link
          href={href}
          className="shrink-0 text-xs font-semibold text-violet-300 hover:text-violet-200"
        >
          {action}
        </Link>
      </div>
    </article>
  );
}

function PortfolioChart({ cases }: { cases: LegalCase[] }) {
  const now = new Date();
  const months = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1);
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const opened = cases.filter((item) => {
      const created = new Date(item.created_at);
      return created >= date && created < next;
    }).length;
    const closed = cases.filter(
      (item) =>
        item.status === "closed" &&
        (() => {
          const updated = new Date(item.updated_at);
          return updated >= date && updated < next;
        })(),
    ).length;
    return {
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(date)
        .replace(".", ""),
      opened,
      closed,
    };
  });
  const max = Math.max(
    1,
    ...months.flatMap((item) => [item.opened, item.closed]),
  );
  const points = months
    .map(
      (item, index) => `${index * (100 / 6)},${100 - (item.opened / max) * 84}`,
    )
    .join(" ");
  const delta = months[6].opened - months[6].closed;
  return (
    <section className="h-full rounded-xl border border-od-border bg-od-surface p-5">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Fluxo da carteira</h2>
          <p className="mt-1 text-xs text-white/60">
            Novos casos e encerramentos nos últimos 7 meses
          </p>
        </div>
        <span className="text-xs font-semibold text-violet-200">
          {delta >= 0 ? "+" : ""}
          {delta} casos no mês
        </span>
      </div>
      <div className="h-56 w-full sm:h-64">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          aria-label="Evolução de novos casos"
        >
          <g stroke="rgba(255,255,255,.07)" strokeWidth=".35">
            {[20, 40, 60, 80, 100].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} />
            ))}
          </g>
          <polyline
            points={points}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="rgba(139,92,246,.12)"
          />
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-xs text-white/65">
        {months.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </section>
  );
}

function FinanceSummary({
  progress,
  paid,
  overdue,
  open,
  count,
}: {
  progress: number;
  paid: number;
  overdue: number;
  open: number;
  count: number;
}) {
  return (
    <section className="h-full overflow-hidden rounded-xl border border-od-border bg-[#292530] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Meta de recebimento</h2>
          <p className="mt-1 text-xs text-white/65">
            Resultado financeiro do mês
          </p>
        </div>
        <Link
          href="/painel/financeiro#recebiveis"
          className="shrink-0 whitespace-nowrap text-xs font-semibold text-white/75 hover:text-white"
        >
          Ver recebíveis
        </Link>
      </div>
      <strong className="mt-6 block text-3xl font-extrabold tracking-[-.03em]">
        {progress}%
      </strong>
      <span className="mt-1 block text-xs text-white/65">
        da previsão mensal recebida
      </span>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${progress}%` }}
        />
      </div>
      <dl className="mt-6 grid grid-cols-2 divide-x divide-white/15 border-y border-white/15 py-4">
        <div className="pr-4">
          <dt className="text-xs font-medium text-white/65">Recebido</dt>
          <dd className="mt-2 text-lg font-bold">{formatBRL(paid)}</dd>
        </div>
        <div className="pl-4">
          <dt className="text-xs font-medium text-white/65">Vencido</dt>
          <dd className="mt-2 text-lg font-bold text-red-100">
            {formatBRL(overdue)}
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex items-center justify-between gap-4 text-xs">
        <span className="font-medium text-white/65">Honorários a receber</span>
        <span className="text-right font-semibold">
          {formatBRL(open)}
          <small className="block font-normal text-white/60">
            {count} parcelas
          </small>
        </span>
      </div>
    </section>
  );
}

function CasesTable({
  cases,
  total,
  contacts,
  members,
}: {
  cases: LegalCase[];
  total: number;
  contacts: Map<string, string>;
  members: Map<string, string>;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-od-border bg-od-surface p-5">
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-base font-semibold">Casos em acompanhamento</h2>
          <p className="mt-1 text-xs text-white/65">
            Ordenados pelo próximo compromisso
          </p>
        </div>
        <Link
          href="/painel/juridico/processos"
          className="flex items-center gap-1 text-xs font-semibold text-white/65 hover:text-white"
        >
          Ver {total} casos
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="hidden grid-cols-[1.4fr_.75fr_1fr_.9fr_1fr_28px] items-center gap-3 pb-2 text-xs font-semibold uppercase tracking-wide text-white/65 sm:grid">
        <span>Cliente / caso</span>
        <span>Área</span>
        <span>Responsável</span>
        <span>Situação</span>
        <span className="text-right">Próximo prazo</span>
        <span />
      </div>
      {cases.length ? (
        cases.map((item) => {
          const owner = item.responsible_id
            ? members.get(item.responsible_id) || "Sem nome"
            : "Equipe";
          const client = item.contact_id
            ? contacts.get(item.contact_id) || item.title
            : item.title;
          const urgent = Boolean(
            item.next_deadline_at &&
            new Date(item.next_deadline_at) <=
              new Date(Date.now() + 7 * 86_400_000),
          );
          return (
            <Link
              key={item.id}
              href={`/painel/juridico/processos/${item.id}`}
              className="grid gap-2 border-t border-white/[0.06] py-3 hover:bg-white/[0.02] sm:grid-cols-[1.4fr_.75fr_1fr_.9fr_1fr_28px] sm:items-center sm:gap-3"
            >
              <span className="min-w-0">
                <strong className="block truncate text-[13px] font-semibold">
                  {client}
                </strong>
                <small className="mt-1 block truncate font-mono text-xs text-white/45">
                  {item.case_number || item.title}
                </small>
              </span>
              <span className="text-xs text-white/65">
                {item.area || "Não informada"}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/65">
                <span className="grid size-5 place-items-center rounded-full bg-white/[0.08] text-[9px]">
                  {owner.charAt(0)}
                </span>
                {owner}
              </span>
              <span className="w-fit rounded-md bg-violet-400/15 px-2 py-0.5 text-[11px] font-semibold text-violet-200">
                {CASE_STATUS[item.status]}
              </span>
              <span
                className={`text-xs sm:text-right ${urgent ? "font-semibold text-[#fb7767]" : "text-white/65"}`}
              >
                {shortDate(item.next_deadline_at)}
              </span>
              <ArrowUpRight
                size={13}
                className="hidden text-white/35 sm:block"
              />
            </Link>
          );
        })
      ) : (
        <p className="py-8 text-center text-sm text-white/48">
          Nenhum caso ativo. Abra o primeiro caso para iniciar a carteira.
        </p>
      )}
    </section>
  );
}
