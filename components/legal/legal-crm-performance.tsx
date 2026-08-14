import Link from "next/link";
import { LegalAcquisitionCostForm } from "@/components/legal/legal-acquisition-cost-form";
import type { LegalCrmMetrics, LegalCrmPeriodKey } from "@/lib/law/legal-crm-metrics";

type SearchValue = string | string[] | undefined;

const PERIODS: ReadonlyArray<{ key: LegalCrmPeriodKey; label: string }> = [
  { key: "current_month", label: "Este mês" },
  { key: "previous_month", label: "Mês anterior" },
  { key: "last_3_months", label: "3 meses" },
  { key: "last_6_months", label: "6 meses" },
];

function integer(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function percent(value: number | null) {
  return value === null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
}

function money(value: number | null) {
  if (value === null) return "Sem dados";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function periodHref(key: LegalCrmPeriodKey, searchParams?: Record<string, SearchValue>) {
  const query = new URLSearchParams();
  for (const [name, rawValue] of Object.entries(searchParams ?? {})) {
    if (name === "crm_period") continue;
    for (const value of Array.isArray(rawValue) ? rawValue : [rawValue]) {
      if (value !== undefined) query.append(name, value);
    }
  }
  query.set("crm_period", key);
  return "/painel/juridico?" + query.toString();
}

function Unavailable({ children = "Dados indisponíveis neste momento." }: { children?: string }) {
  return <p className="mt-2 text-sm text-white/64">{children}</p>;
}

function ResponseValue({ value }: { value: LegalCrmMetrics["firstResponse"] }) {
  if (value.status !== "ready") {
    if (value.status === "unavailable" && value.reason === "no_whatsapp") {
      return (
        <div>
          <span className="text-lg font-semibold text-white/78">Indisponível</span>
          <p className="mt-1 text-xs leading-5 text-white/64">
            Conecte o WhatsApp para medir a primeira resposta.{" "}
            <Link href="/painel/configuracoes" className="text-blue-300 underline-offset-4 hover:underline">
              Configurar canal
            </Link>
          </p>
        </div>
      );
    }
    return value.status === "empty"
      ? <Unavailable>Nenhuma conversa recebida no período.</Unavailable>
      : <Unavailable />;
  }
  if (value.medianMinutes === null) {
    return (
      <div>
        <span className="text-lg font-semibold text-white/78">Aguardando resposta</span>
        <p className="mt-1 text-xs text-white/64">{integer(value.pending)} conversa(s) pendente(s)</p>
      </div>
    );
  }
  return (
    <div>
      <span className="text-[clamp(1.35rem,2vw,1.8rem)] font-semibold tracking-[-0.03em] text-white">
        {integer(value.medianMinutes)} min
      </span>
      <p className="mt-1 text-xs text-white/64">
        {value.human} humanas · {value.ai} por IA · {value.pending} pendentes
      </p>
    </div>
  );
}

function MetricBand({ metrics, canManageFinance }: { metrics: LegalCrmMetrics; canManageFinance: boolean }) {
  const first = metrics.funnel?.[0];
  const won = metrics.funnel?.find((item) => item.stage === "ganho");
  const finalConversion = first && won && first.reached > 0 ? (won.reached / first.reached) * 100 : null;
  const showFinance = metrics.availability.cac !== "hidden" && metrics.cac.status !== "hidden";

  return (
    <dl className="grid min-w-0 gap-5 rounded-[15px] bg-[#1b1b20] p-5 sm:grid-cols-2 xl:grid-cols-[1.15fr_.85fr_.85fr_1fr] xl:p-6">
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-white/64">Tempo de 1ª resposta</dt>
        <dd className="mt-2"><ResponseValue value={metrics.firstResponse} /></dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-white/64">Leads qualificados</dt>
        <dd className="mt-2">
          {metrics.availability.leads === "ready" && metrics.leads ? (
            <>
              <span className="text-[clamp(1.35rem,2vw,1.8rem)] font-semibold tracking-[-0.03em] text-white">
                {integer(metrics.leads.qualified)}
              </span>
              <p className="mt-1 text-xs text-white/64">de {integer(metrics.leads.total)} contatos únicos</p>
            </>
          ) : <Unavailable />}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-white/64">Conversão final</dt>
        <dd className="mt-2">
          {metrics.availability.funnel === "ready" ? (
            <>
              <span className="text-[clamp(1.35rem,2vw,1.8rem)] font-semibold tracking-[-0.03em] text-white">
                {percent(finalConversion)}
              </span>
              <p className="mt-1 text-xs text-white/64">contratados sobre negócios recebidos</p>
            </>
          ) : <Unavailable />}
        </dd>
      </div>
      {showFinance ? (
        <div className="min-w-0">
          <dt className="text-xs font-semibold text-white/64">CAC</dt>
          <dd className="mt-2">
            {metrics.cac.status === "ready" ? (
              <>
                <span className="text-[clamp(1.35rem,2vw,1.8rem)] font-semibold tracking-[-0.03em] text-white">
                  {money(metrics.cac.valueCents)}
                </span>
                <p className="mt-1 text-xs text-white/64">{metrics.cac.wins} contrato(s) no período</p>
              </>
            ) : metrics.cac.status === "not_configured" ? (
              <div className="space-y-2">
                <span className="text-lg font-semibold text-white/78">Não configurado</span>
                {canManageFinance ? <LegalAcquisitionCostForm /> : null}
              </div>
            ) : metrics.cac.status === "no_wins" ? (
              <Unavailable>Sem contratos no período.</Unavailable>
            ) : <Unavailable />}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function Funnel({ metrics }: { metrics: LegalCrmMetrics }) {
  const maximum = Math.max(1, ...(metrics.funnel ?? []).map((item) => item.reached));
  return (
    <section aria-labelledby="legal-crm-funnel-title" className="min-w-0">
      <h3 id="legal-crm-funnel-title" className="text-base font-semibold text-white">Conversão por etapa</h3>
      <p className="mt-1 text-xs leading-5 text-white/64">Negócios recebidos no período e o avanço real de cada etapa.</p>
      {metrics.availability.funnel !== "ready" || !metrics.funnel ? <Unavailable /> : metrics.funnel.length === 0 ? (
        <Unavailable>Nenhum negócio recebido no período.</Unavailable>
      ) : (
        <ol className="mt-5 space-y-4">
          {metrics.funnel.map((item) => (
            <li key={item.stage} className="min-w-0">
              <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-white/72">{item.label}</span>
                <span className="shrink-0 tabular-nums text-white/64">
                  {integer(item.reached)}{item.conversionFromPrevious !== null ? " · " + percent(item.conversionFromPrevious) : ""}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.065]" aria-hidden="true">
                <span className="block h-full rounded-full bg-blue-500" style={{ width: Math.max(4, item.reached / maximum * 100) + "%" }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Origins({ metrics }: { metrics: LegalCrmMetrics }) {
  return (
    <section aria-labelledby="legal-crm-origins-title" className="min-w-0">
      <h3 id="legal-crm-origins-title" className="text-base font-semibold text-white">Origens que mais convertem</h3>
      <p className="mt-1 text-xs leading-5 text-white/64">Contatos, qualificados e contratos por canal.</p>
      {metrics.availability.origins !== "ready" || !metrics.origins ? <Unavailable /> : metrics.origins.length === 0 ? (
        <Unavailable>Nenhuma origem registrada no período.</Unavailable>
      ) : (
        <ol className="mt-4 space-y-4">
          {metrics.origins.slice(0, 6).map((item) => (
            <li key={item.source} className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-medium text-white/76">{item.source}</strong>
                  <span className="mt-1 block text-xs text-white/64">{item.leads} leads · {item.qualified} qualificados · {item.wins} contratos</span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-blue-300">{percent(item.conversion)}</span>
              </div>
              {metrics.availability.originRevenue === "ready" && item.receivedCents !== null ? (
                <p className="mt-1 text-xs text-white/64">Recebido: {money(item.receivedCents)}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {metrics.availability.originRevenue === "unavailable" ? (
        <Unavailable>Receita por origem indisponível neste momento.</Unavailable>
      ) : null}
    </section>
  );
}

function Losses({ metrics }: { metrics: LegalCrmMetrics }) {
  const maximum = Math.max(1, ...(metrics.losses ?? []).map((item) => item.count));
  return (
    <section aria-labelledby="legal-crm-losses-title" className="min-w-0">
      <h3 id="legal-crm-losses-title" className="text-base font-semibold text-white">Principais motivos de perda</h3>
      <p className="mt-1 text-xs leading-5 text-white/64">Razões registradas ao marcar um atendimento como não contratado.</p>
      {metrics.availability.losses !== "ready" || !metrics.losses ? <Unavailable /> : metrics.losses.length === 0 ? (
        <Unavailable>Nenhuma perda registrada no período.</Unavailable>
      ) : (
        <ol className="mt-5 space-y-3">
          {metrics.losses.slice(0, 6).map((item) => (
            <li key={item.code} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <span className="block truncate text-sm text-white/68">{item.label}</span>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                  <span className="block h-full rounded-full bg-blue-500/72" style={{ width: item.count / maximum * 100 + "%" }} />
                </div>
              </div>
              <span className="tabular-nums text-sm font-semibold text-white/68">{integer(item.count)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Ltv({ metrics }: { metrics: LegalCrmMetrics }) {
  if (!metrics.ltv) return null;
  return (
    <section aria-labelledby="legal-crm-ltv-title" className="min-w-0 rounded-[15px] bg-[#1b1b20] p-5">
      <h3 id="legal-crm-ltv-title" className="text-base font-semibold text-white">Valor por cliente</h3>
      <p className="mt-1 text-xs leading-5 text-white/64">Médias de todo o relacionamento, sem depender do filtro mensal.</p>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-white/64">LTV recebido</dt>
          <dd className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white">
            {metrics.availability.ltvReceived === "ready" ? money(metrics.ltv.receivedCents) : "Indisponível"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-white/64">LTV contratado</dt>
          <dd className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white">
            {metrics.availability.ltvContracted === "ready" ? money(metrics.ltv.contractedCents) : "Indisponível"}
          </dd>
        </div>
      </dl>
      {metrics.availability.ltvUnlinked === "ready" && metrics.ltv.unlinkedRecords ? (
        <p className="mt-4 rounded-[9px] bg-amber-400/[0.08] px-3 py-2 text-xs leading-5 text-amber-100/72">
          {metrics.ltv.unlinkedRecords} registro(s) financeiro(s) sem cliente vinculado ficaram fora da média.
        </p>
      ) : null}
    </section>
  );
}

export function LegalCrmPerformance({
  metrics,
  canManageFinance,
  searchParams,
}: {
  metrics: LegalCrmMetrics;
  canManageFinance: boolean;
  searchParams?: Record<string, SearchValue>;
}) {
  return (
    <section aria-labelledby="legal-crm-title" className="min-w-0 space-y-7 py-2">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-300">CRM jurídico</p>
          <h2 id="legal-crm-title" className="mt-2 text-[clamp(1.35rem,2.4vw,2rem)] font-semibold tracking-[-0.035em] text-white">
            Desempenho comercial jurídico
          </h2>
          <p className="mt-2 text-sm text-white/64">Atendimento, conversão e retorno financeiro.</p>
        </div>
        <nav aria-label="Período do desempenho comercial" className="flex max-w-full flex-wrap gap-1 rounded-[11px] bg-white/[0.035] p-1">
          {PERIODS.map((item) => (
            <Link
              key={item.key}
              href={periodHref(item.key, searchParams)}
              aria-current={metrics.period.key === item.key ? "page" : undefined}
              className={"inline-flex min-h-11 shrink-0 items-center rounded-[9px] px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " + (
                metrics.period.key === item.key ? "bg-blue-600 text-white" : "text-white/68 hover:bg-white/[0.055] hover:text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {metrics.coverage?.partial ? (
        <p role="status" className="rounded-[11px] bg-blue-500/[0.08] px-4 py-3 text-sm leading-6 text-blue-100/72">
          Histórico parcial: transições confiáveis disponíveis desde {shortDate(metrics.coverage.startedAt)}. Dados anteriores não foram estimados.
        </p>
      ) : metrics.availability.coverage === "unavailable" ? (
        <p role="status" className="rounded-[11px] bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/68">
          Cobertura histórica indisponível. O painel não estima transições antigas.
        </p>
      ) : null}

      <MetricBand metrics={metrics} canManageFinance={canManageFinance} />
      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.8fr)]">
        <Funnel metrics={metrics} />
        <Origins metrics={metrics} />
      </div>
      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]">
        <Losses metrics={metrics} />
        {metrics.availability.ltvReceived !== "hidden" || metrics.availability.ltvContracted !== "hidden"
          ? <Ltv metrics={metrics} />
          : null}
      </div>
    </section>
  );
}
