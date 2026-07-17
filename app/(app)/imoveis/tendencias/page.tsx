import Link from "next/link";
import { notFound } from "next/navigation";
import {
  computeDemandByNeighborhood,
  computeDemandByPropertyType,
  computePortfolioGaps,
  computeVelocityByType,
  MIN_SAMPLE_SIZE,
} from "@/lib/real-estate-trends";
import { getActiveOrgId } from "@/lib/org";
import { canViewRealEstate, isRealEstateV2Enabled, propertyTypeLabel } from "@/lib/real-estate";
import { getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateLeadPreferences, RealEstatePropertyType, RealEstateProperty } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconArrowRight } from "../../icons";

// 4.5 (Fase 4): tendências e inteligência de portfólio. Todo número aqui
// vem acompanhado de um selo de amostra suficiente/insuficiente — nunca
// esconde o dado, mas também nunca finge precisão que a amostra não
// sustenta (ver lib/real-estate-trends.ts e
// docs/roadmap-imobiliario/4.5-tendencias-portfolio.md).
export default async function RealEstateTrendsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const orgId = await getActiveOrgId(supabase, user.id);
  const [{ data: profile }, orgRole, { data: membership }, { data: org }] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle(),
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin ?? false);
  if (workspaceKey !== "real_estate_broker") notFound();
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin) || !isRealEstateV2Enabled(org)) notFound();

  const [{ data: preferenceRows }, { data: propertyRows }] = await Promise.all([
    supabase.from("real_estate_lead_preferences").select("neighborhoods, property_types").eq("org_id", orgId),
    supabase
      .from("real_estate_properties")
      .select("property_type, address_neighborhood, status, created_at, updated_at")
      .eq("org_id", orgId)
      .eq("workspace_key", "real_estate_broker"),
  ]);

  const preferences = (preferenceRows ?? []) as Pick<RealEstateLeadPreferences, "neighborhoods" | "property_types">[];
  const properties = (propertyRows ?? []) as Pick<
    RealEstateProperty,
    "property_type" | "address_neighborhood" | "status" | "created_at" | "updated_at"
  >[];

  const demandByNeighborhood = computeDemandByNeighborhood(preferences);
  const demandByType = computeDemandByPropertyType(preferences);
  const portfolioByNeighborhood = computeDemandByNeighborhood(
    properties.map((p) => ({ neighborhoods: p.address_neighborhood ? [p.address_neighborhood] : [] }))
  );
  const gaps = computePortfolioGaps(demandByNeighborhood, portfolioByNeighborhood);

  // updated_at como proxy de "quando fechou" (vendido/alugado) — não existe
  // uma coluna dedicada de data de fechamento hoje. Mesma limitação
  // documentada em 1.5 (aging por etapa usa created_at como proxy de
  // "tempo em aberto", não histórico real de mudança).
  const velocity = computeVelocityByType(
    properties
      .filter((p) => p.status === "vendido" || p.status === "alugado")
      .map((p) => ({ propertyType: p.property_type, createdAt: p.created_at, closedAt: p.updated_at }))
  );

  return (
    <div className="max-w-4xl space-y-4 sm:space-y-5">
      <header className="enter rounded-lg border border-line bg-surface p-5 sm:p-6">
        <Link href="/imoveis" className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink">
          <IconArrowRight className="h-4 w-4 rotate-180" />
          Voltar para Imóveis
        </Link>
        <h1 className="mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink">
          Tendências de portfólio
        </h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Demanda declarada pelos clientes, velocidade de venda/locação e onde a carteira não cobre a
          demanda. Números com menos de {MIN_SAMPLE_SIZE} registros aparecem marcados como amostra
          insuficiente — ainda mostrados, nunca escondidos, mas sem fingir precisão que não existe.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="panel p-5 sm:p-6">
          <h2 className="text-base font-black tracking-[-0.02em] text-ink">Demanda por bairro</h2>
          <ul className="mt-3 space-y-1.5">
            {demandByNeighborhood.slice(0, 10).map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-semibold text-ink-soft">{row.key}</span>
                <span className={"shrink-0 font-black " + (row.sufficientSample ? "text-ink" : "text-ink-muted")}>
                  {row.count} {!row.sufficientSample && "(amostra insuficiente)"}
                </span>
              </li>
            ))}
            {demandByNeighborhood.length === 0 && <li className="text-sm font-medium text-ink-muted">Sem preferências registradas ainda.</li>}
          </ul>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-base font-black tracking-[-0.02em] text-ink">Demanda por tipo</h2>
          <ul className="mt-3 space-y-1.5">
            {demandByType.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-ink-soft">{propertyTypeLabel(row.key as RealEstatePropertyType)}</span>
                <span className={"shrink-0 font-black " + (row.sufficientSample ? "text-ink" : "text-ink-muted")}>
                  {row.count} {!row.sufficientSample && "(amostra insuficiente)"}
                </span>
              </li>
            ))}
            {demandByType.length === 0 && <li className="text-sm font-medium text-ink-muted">Sem preferências registradas ainda.</li>}
          </ul>
        </section>
      </div>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-black tracking-[-0.02em] text-ink">Velocidade por tipo (dias até vender/alugar)</h2>
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          Baseado na última atualização do imóvel como proxy de data de fechamento — não é um
          histórico real de status, é uma aproximação.
        </p>
        <ul className="mt-3 space-y-1.5">
          {velocity.map((row) => (
            <li key={row.propertyType} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-ink-soft">{propertyTypeLabel(row.propertyType)}</span>
              <span className={"shrink-0 font-black " + (row.sufficientSample ? "text-ink" : "text-ink-muted")}>
                {row.avgDaysToClose}d em média ({row.sampleSize} {row.sampleSize === 1 ? "imóvel" : "imóveis"})
                {!row.sufficientSample && " — amostra insuficiente"}
              </span>
            </li>
          ))}
          {velocity.length === 0 && <li className="text-sm font-medium text-ink-muted">Nenhum imóvel vendido/alugado ainda.</li>}
        </ul>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-black tracking-[-0.02em] text-ink">Lacunas de estoque por bairro</h2>
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          Demanda menos o que a carteira tem — positivo indica falta de estoque naquele bairro.
        </p>
        <ul className="mt-3 space-y-1.5">
          {gaps.slice(0, 10).map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-semibold text-ink-soft">{row.key}</span>
              <span className={"shrink-0 font-black " + (row.sufficientSample ? (row.gap > 0 ? "text-warning-700" : "text-ink") : "text-ink-muted")}>
                {row.gap > 0 ? `+${row.gap} sem estoque` : `${row.gap} (coberto)`}
                {!row.sufficientSample && " — amostra insuficiente"}
              </span>
            </li>
          ))}
          {gaps.length === 0 && <li className="text-sm font-medium text-ink-muted">Sem dados suficientes ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
