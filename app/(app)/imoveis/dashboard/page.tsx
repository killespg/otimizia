import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { canManageRealEstate, canViewRealEstate, isRealEstateV2Enabled } from "@/lib/real-estate";
import { isCommissionOverdue } from "@/lib/real-estate-commissions";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateCommission, RealEstateTarget } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconPlus } from "../../icons";
import { cancelCommission, createCommission, createTarget, recordCommissionPayment } from "../commission-actions";

function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function firstOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}
function lastOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

// RE-6xx (Fase 6): dashboard imobiliário próprio, separado do /dashboard
// genérico (todas as profissões) — mesma decisão da Fase 2 de não tocar
// nada compartilhado entre workspaces.
export default async function RealEstateDashboardPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; broker?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "real_estate_broker") notFound();

  const [orgRole, { data: membership }, { data: org }, members] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
    getOrgMembers(supabase, orgId),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin) || !isRealEstateV2Enabled(org)) notFound();
  const canManage = canManageRealEstate(membership?.job_role, isAdmin);

  const now = new Date();
  const from = searchParams.from || firstOfMonth(now);
  const to = searchParams.to || lastOfMonth(now);
  const brokerFilter = searchParams.broker || "";
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  let propertiesQuery = supabase.from("real_estate_properties").select("id, captured_by", { count: "exact" }).eq("org_id", orgId).gte("created_at", fromIso).lte("created_at", toIso);
  let collectionsQuery = supabase.from("real_estate_share_collections").select("id", { count: "exact" }).eq("org_id", orgId).gte("created_at", fromIso).lte("created_at", toIso);
  let visitsQuery = supabase.from("real_estate_visits").select("id, status, broker_id", { count: "exact" }).eq("org_id", orgId).gte("created_at", fromIso).lte("created_at", toIso);
  let offersQuery = supabase.from("real_estate_offers").select("id, status, created_by", { count: "exact" }).eq("org_id", orgId).gte("created_at", fromIso).lte("created_at", toIso);
  let commissionsQuery = supabase.from("real_estate_commissions").select("*").eq("org_id", orgId).gte("created_at", fromIso).lte("created_at", toIso);

  if (brokerFilter) {
    propertiesQuery = propertiesQuery.eq("captured_by", brokerFilter);
    visitsQuery = visitsQuery.eq("broker_id", brokerFilter);
    offersQuery = offersQuery.eq("created_by", brokerFilter);
    commissionsQuery = commissionsQuery.eq("broker_id", brokerFilter);
  }

  const [{ count: capturedCount }, { count: showcaseCount }, { data: visits }, { data: offers }, { data: commissionRows }, { data: targetRows }, { data: dealsForCommission }, { data: propertiesForCommission }] =
    await Promise.all([
      propertiesQuery,
      collectionsQuery,
      visitsQuery,
      offersQuery,
      commissionsQuery.order("created_at", { ascending: false }),
      supabase.from("real_estate_targets").select("*").eq("org_id", orgId).lte("period_start", to).gte("period_end", from),
      supabase.from("deals").select("id, title").eq("org_id", orgId).eq("workspace_key", "real_estate_broker").order("created_at", { ascending: false }).limit(50),
      supabase.from("real_estate_properties").select("id, title").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50),
    ]);

  const commissions = (commissionRows ?? []) as RealEstateCommission[];
  const targets = (targetRows ?? []) as RealEstateTarget[];
  const visitsList = visits ?? [];
  const offersList = offers ?? [];

  const expectedTotal = commissions.reduce((sum, c) => sum + c.expected_amount_cents, 0);
  const receivedTotal = commissions.reduce((sum, c) => sum + c.received_amount_cents, 0);
  const overdueCount = commissions.filter(isCommissionOverdue).length;

  return (
    <div className="max-w-4xl space-y-4 sm:space-y-5">
      <header className="enter flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black text-brand-700">Carteira</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">Dashboard imobiliário</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">Captação, vitrines, visitas, propostas e comissão do período.</p>
        </div>
        <a href="/api/reports/real-estate-commissions" className="btn-soft">
          Exportar comissões (CSV)
        </a>
      </header>

      <section className="panel p-4 sm:p-5">
        <form className="grid gap-2 sm:grid-cols-3" method="get">
          <label className="block">
            <span className="label">De</span>
            <input type="date" name="from" defaultValue={from} className="field mt-1" />
          </label>
          <label className="block">
            <span className="label">Até</span>
            <input type="date" name="to" defaultValue={to} className="field mt-1" />
          </label>
          <label className="block">
            <span className="label">Corretor</span>
            <select name="broker" defaultValue={brokerFilter} className="field mt-1">
              <option value="">Todos</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name ?? "Sem nome"}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-soft">
              Filtrar
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Captados" value={String(capturedCount ?? 0)} />
        <Metric label="Vitrines enviadas" value={String(showcaseCount ?? 0)} />
        <Metric label="Visitas" value={`${visitsList.filter((v) => v.status === "completed").length}/${visitsList.length}`} />
        <Metric label="Propostas aceitas" value={`${offersList.filter((o) => o.status === "accepted").length}/${offersList.length}`} />
        <Metric label="Comissão recebida" value={centsToReais(receivedTotal)} />
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black text-ink">Comissões</h2>
          <p className="text-xs font-bold text-ink-muted">
            Prevista: {centsToReais(expectedTotal)} · Recebida: {centsToReais(receivedTotal)}
            {overdueCount > 0 && <span className="ml-2 text-danger-600">· {overdueCount} vencida(s)</span>}
          </p>
        </div>

        <div className="mt-3 space-y-2">
          {commissions.length === 0 ? (
            <p className="text-sm font-medium text-ink-muted">Nenhuma comissão registrada no período.</p>
          ) : (
            commissions.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
                <span className="font-bold text-ink">
                  {centsToReais(c.expected_amount_cents)} <span className="text-ink-muted">({c.commission_percent}%)</span>
                </span>
                <span className={"tag " + (isCommissionOverdue(c) ? "bg-danger-50 text-danger-700" : "bg-surface-2 text-ink-muted")}>
                  {isCommissionOverdue(c) ? "Vencida" : c.status === "received" ? "Recebida" : c.status === "partial" ? "Parcial" : c.status === "cancelled" ? "Cancelada" : "Prevista"}
                </span>
                {canManage && c.status !== "received" && c.status !== "cancelled" && (
                  <form action={recordCommissionPayment} className="flex items-center gap-1.5">
                    <input type="hidden" name="commission_id" value={c.id} />
                    <input name="amount" placeholder="Valor recebido" className="field h-8 w-32 py-0 text-xs" />
                    <PendingButton className="press-sm rounded-md bg-brand-700 px-2 py-1 text-[11px] font-black text-white hover:bg-brand-800" pendingLabel="...">
                      Registrar
                    </PendingButton>
                  </form>
                )}
              </div>
            ))
          )}
        </div>

        {canManage && (
          <form action={createCommission} className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
            <select name="deal_id" required className="field">
              <option value="">Atendimento</option>
              {(dealsForCommission ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <select name="property_id" required className="field">
              <option value="">Imóvel</option>
              {(propertiesForCommission ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <select name="broker_id" required className="field">
              <option value="">Corretor</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name ?? "Sem nome"}
                </option>
              ))}
            </select>
            <input name="gross_sale_value" required placeholder="Valor da venda (R$)" className="field" />
            <input name="commission_percent" required placeholder="% de comissão" className="field" />
            <input type="date" name="due_at" placeholder="Vencimento" className="field" />
            <div className="sm:col-span-2">
              <PendingButton className="btn-soft" pendingLabel="Registrando">
                <IconPlus className="h-4 w-4" />
                Registrar comissão
              </PendingButton>
            </div>
          </form>
        )}
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-black text-ink">Metas do período</h2>
        {targets.length === 0 ? (
          <p className="mt-2 text-sm font-medium text-ink-muted">Nenhuma meta definida pra este período.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {targets.map((t) => {
              const broker = members.find((m) => m.user_id === t.broker_id);
              return (
                <li key={t.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
                  <span className="font-bold text-ink">{broker ? broker.name ?? "Sem nome" : "Equipe"}</span>
                  <span className="text-ink-muted">{centsToReais(t.target_amount_cents)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {canManage && (
          <form action={createTarget} className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
            <select name="broker_id" className="field">
              <option value="">Equipe inteira</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name ?? "Sem nome"}
                </option>
              ))}
            </select>
            <input name="target_amount" required placeholder="Meta (R$)" className="field" />
            <input type="date" name="period_start" required defaultValue={from} className="field" />
            <input type="date" name="period_end" required defaultValue={to} className="field" />
            <div className="sm:col-span-2">
              <PendingButton className="btn-soft" pendingLabel="Criando">
                Definir meta
              </PendingButton>
            </div>
          </form>
        )}
      </section>

      <Link href="/imoveis" className="nav-item inline-block text-sm font-black text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="panel p-3 sm:p-4">
      <p className="text-xs font-bold text-ink-soft">{label}</p>
      <p className="mt-1 text-xl font-black text-ink">{value}</p>
    </article>
  );
}
