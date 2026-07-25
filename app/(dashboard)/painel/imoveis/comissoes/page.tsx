import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, HandCoins, Target, TriangleAlert, WalletCards } from "lucide-react";
import { canManageRealEstate, canViewRealEstate, isRealEstateV2Enabled } from "@/lib/real-estate";
import { isCommissionOverdue } from "@/lib/real-estate-commissions";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateCommission, RealEstateTarget } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { CommissionPanel, TargetsPanel } from "../dashboard/RealEstateDashboard";

function firstOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function lastOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function RealEstateCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; broker?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user.id),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin,
  );
  if (workspaceKey !== "real_estate_broker") notFound();

  const [orgRole, { data: membership }, { data: organization }, members] = await Promise.all([
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
    getOrgMembers(supabase, orgId),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin) || !isRealEstateV2Enabled(organization)) notFound();

  const now = new Date();
  const from = filters.from || firstOfMonth(now);
  const to = filters.to || lastOfMonth(now);
  const brokerFilter = filters.broker || "";
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  let commissionsQuery = supabase
    .from("real_estate_commissions")
    .select("*")
    .eq("org_id", orgId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  let targetsQuery = supabase
    .from("real_estate_targets")
    .select("*")
    .eq("org_id", orgId)
    .lte("period_start", to)
    .gte("period_end", from);

  if (brokerFilter) {
    commissionsQuery = commissionsQuery.eq("broker_id", brokerFilter);
    targetsQuery = targetsQuery.eq("broker_id", brokerFilter);
  }

  const [{ data: commissionRows }, { data: targetRows }, { data: deals }, { data: properties }] = await Promise.all([
    commissionsQuery.order("created_at", { ascending: false }),
    targetsQuery.order("period_start", { ascending: false }),
    supabase.from("deals").select("id, title").eq("org_id", orgId).eq("workspace_key", "real_estate_broker").order("created_at", { ascending: false }).limit(50),
    supabase.from("real_estate_properties").select("id, title").eq("org_id", orgId).eq("workspace_key", "real_estate_broker").order("created_at", { ascending: false }).limit(50),
  ]);

  const commissions = (commissionRows ?? []) as RealEstateCommission[];
  const targets = (targetRows ?? []) as RealEstateTarget[];
  const activeCommissions = commissions.filter((commission) => commission.status !== "cancelled");
  const expectedTotal = activeCommissions.reduce((sum, commission) => sum + commission.expected_amount_cents, 0);
  const receivedTotal = activeCommissions.reduce((sum, commission) => sum + commission.received_amount_cents, 0);
  const outstandingTotal = Math.max(0, expectedTotal - receivedTotal);
  const overdueCount = activeCommissions.filter(isCommissionOverdue).length;
  const targetTotal = targets.reduce((sum, target) => sum + target.target_amount_cents, 0);
  const canManage = canManageRealEstate(membership?.job_role, isAdmin);

  const summary = [
    { label: "Comissão prevista", value: centsToReais(expectedTotal), note: `${activeCommissions.length} lançamentos`, icon: HandCoins },
    { label: "Recebida", value: centsToReais(receivedTotal), note: expectedTotal > 0 ? `${Math.round((receivedTotal / expectedTotal) * 100)}% da previsão` : "sem previsão no período", icon: WalletCards },
    { label: "A receber", value: centsToReais(outstandingTotal), note: overdueCount > 0 ? `${overdueCount} vencidas` : "nenhuma pendência vencida", icon: TriangleAlert },
    { label: "Meta do período", value: targetTotal > 0 ? centsToReais(targetTotal) : "Não definida", note: targetTotal > 0 ? "objetivo vigente" : "configure abaixo", icon: Target },
  ];

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-6">
      <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/painel/imoveis/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-white/42 hover:text-white/72"><ArrowLeft size={14} /> Voltar à visão geral</Link>
          <h1 className="mt-4 text-od-title text-white">Comissões e metas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/52">Registre previsões, acompanhe recebimentos e defina objetivos para a equipe ou para cada corretor.</p>
        </div>
        <a href="/api/reports/real-estate-commissions" download className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-white/[0.1] px-4 text-[13px] font-semibold text-white/68 hover:bg-white/[0.04] hover:text-white"><Download size={15} /> Baixar relatório</a>
      </header>

      <form method="get" className="grid gap-3 border-y border-white/[0.08] py-4 sm:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(12rem,1.3fr)_auto] sm:items-end">
        <label><span className="label">De</span><input type="date" name="from" defaultValue={from} className="field mt-1" /></label>
        <label><span className="label">Até</span><input type="date" name="to" defaultValue={to} className="field mt-1" /></label>
        <label><span className="label">Corretor</span><select name="broker" defaultValue={brokerFilter} className="field mt-1"><option value="">Todos</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name ?? "Sem nome"}</option>)}</select></label>
        <button type="submit" className="btn-secondary">Aplicar filtros</button>
      </form>

      <section className="grid grid-cols-2 border-y border-white/[0.08] xl:grid-cols-4">
        {summary.map(({ icon: Icon, ...item }) => <div key={item.label} className="min-w-0 border-b border-r border-white/[0.08] py-4 pr-4 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 xl:pl-5 xl:even:border-r xl:last:border-r-0 xl:first:pl-0"><div className="flex items-center gap-2 text-xs font-medium text-white/48"><Icon size={15} className="text-od-text-2" />{item.label}</div><p className="mt-3 truncate text-xl font-semibold text-white" title={item.value}>{item.value}</p><p className="mt-2 text-[11px] text-white/38">{item.note}</p></div>)}
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,.55fr)]">
        <CommissionPanel
          commissions={commissions}
          members={members}
          deals={(deals ?? []) as Array<{ id: string; title: string }>}
          properties={(properties ?? []) as Array<{ id: string; title: string }>}
          canManage={canManage}
          expectedTotal={expectedTotal}
          receivedTotal={receivedTotal}
          overdueCount={overdueCount}
        />
        <TargetsPanel targets={targets} members={members} canManage={canManage} from={from} to={to} />
      </section>
    </div>
  );
}
