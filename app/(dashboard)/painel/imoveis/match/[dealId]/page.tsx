import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/ui/PendingButton";
import { RealEstatePageHeader } from "@/components/real-estate/real-estate-ui";
import { canManageRealEstate, canViewRealEstate, isRealEstateV2Enabled, propertyTypeLabel } from "@/lib/real-estate/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateDealProperty, RealEstateLeadPreferences, RealEstateOffer, RealEstateProperty } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconCheck, IconX } from "../../../icons";
import { recalculateDealMatches, updateDealPropertyStatus } from "../../match-actions";
import { scheduleVisit } from "../../visit-actions";
import { OffersSection } from "./OffersSection";

function centsToReais(cents: number | null): string {
  if (cents === null) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const STATUS_LABEL: Record<string, string> = {
  suggested: "Sugerido",
  selected: "Selecionado",
  sent: "Enviado",
  viewed: "Visto",
  interested: "Interessado",
  rejected: "Descartado",
  visit_scheduled: "Visita agendada",
  offer: "Em proposta",
  won: "Fechado",
};

export default async function MatchPage(props: { params: Promise<{ dealId: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "real_estate_broker") notFound();

  const [orgRole, { data: membership }, { data: org }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin) || !isRealEstateV2Enabled(org)) notFound();
  const canManage = canManageRealEstate(membership?.job_role, isAdmin);

  const [{ data: dealRow }, { data: preferencesRow }, { data: matchRows }, { data: collectionRows }, { data: offerRows }] = await Promise.all([
    supabase.from("deals").select("id, title, contact_id").eq("id", params.dealId).eq("org_id", orgId).maybeSingle(),
    supabase.from("real_estate_lead_preferences").select("*").eq("org_id", orgId).eq("deal_id", params.dealId).maybeSingle(),
    supabase
      .from("real_estate_deal_properties")
      .select("*")
      .eq("org_id", orgId)
      .eq("deal_id", params.dealId)
      .order("match_score", { ascending: false, nullsFirst: false }),
    supabase
      .from("real_estate_share_collections")
      .select("id, title, token, view_count, revoked_at")
      .eq("org_id", orgId)
      .eq("deal_id", params.dealId)
      .order("created_at", { ascending: false }),
    supabase.from("real_estate_offers").select("*").eq("org_id", orgId).eq("deal_id", params.dealId).order("created_at", { ascending: true }),
  ]);
  if (!dealRow) notFound();
  const preferences = preferencesRow as RealEstateLeadPreferences | null;
  const matches = (matchRows ?? []) as RealEstateDealProperty[];
  const collections = collectionRows ?? [];
  const offers = (offerRows ?? []) as RealEstateOffer[];

  const propertyIds = matches.map((m) => m.property_id);
  const { data: propertyRows } =
    propertyIds.length > 0
      ? await supabase.from("real_estate_properties").select("*").eq("org_id", orgId).in("id", propertyIds)
      : { data: [] as RealEstateProperty[] };
  const propertyById = new Map(((propertyRows ?? []) as RealEstateProperty[]).map((p) => [p.id, p]));

  return (
    <div className="max-w-5xl space-y-6">
      <RealEstatePageHeader eyebrow="Comercial / Atendimento" title={<>Imóveis de {dealRow.title}</>} description="Acompanhe os imóveis sugeridos, enviados, visitados e negociados neste atendimento, com a explicação de cada compatibilidade." />

      {!preferences ? (
        <section className="real-estate-flat-section py-5 sm:py-6">
          <p className="text-sm font-bold text-ink">
            Este atendimento ainda não tem preferências de busca definidas.{" "}
            <Link href={`/painel/contatos/${dealRow.contact_id}`} className="nav-item text-brand-700 hover:underline">
              Defina o perfil do cliente
            </Link>{" "}
            antes de calcular matches.
          </p>
        </section>
      ) : (
        <>
          {canManage && (
            <form action={recalculateDealMatches}>
              <input type="hidden" name="deal_id" value={params.dealId} />
              <PendingButton className="btn" pendingLabel="Calculando">
                Recalcular matches
              </PendingButton>
            </form>
          )}

          {matches.length === 0 ? (
            <section className="real-estate-flat-section py-5 sm:py-6">
              <p className="text-sm font-medium text-ink-muted">
                Nenhum match calculado ainda. Clique em &quot;Recalcular matches&quot; pra comparar a carteira ativa com as preferências do cliente.
              </p>
            </section>
          ) : (
            <div className="space-y-5">
              {matches.map((match) => {
                const property = propertyById.get(match.property_id);
                if (!property) return null;
                return (
                  <section key={match.id} className="real-estate-flat-section space-y-3 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/painel/imoveis/${property.id}`} className="nav-item text-sm font-semibold text-brand-700 hover:underline">
                          {property.title}
                        </Link>
                        <p className="mt-0.5 text-xs font-bold text-ink-muted">
                          {propertyTypeLabel(property.property_type)} · {property.address_neighborhood ?? "Bairro não informado"} ·{" "}
                          {centsToReais(property.price_cents ?? property.rent_price_cents)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tag bg-brand-50 text-brand-700">{match.match_score ?? 0}%</span>
                        <span className="tag bg-surface-2 text-ink-muted">{STATUS_LABEL[match.status] ?? match.status}</span>
                      </div>
                    </div>

                    <details className="text-xs">
                      <summary className="cursor-pointer font-bold text-ink-muted">Por que esse score?</summary>
                      <ul className="mt-2 space-y-1">
                        {Object.entries(match.match_explanation).map(([key, criterion]) => (
                          <li key={key} className="flex items-start justify-between gap-3 text-ink-soft">
                            <span>{criterion.reason}</span>
                            <span className="shrink-0 font-bold tabular-nums text-ink-muted">
                              {criterion.points}/{criterion.max}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>

                    {canManage && match.status !== "rejected" && (
                      <div className="flex gap-2">
                        <form action={updateDealPropertyStatus}>
                          <input type="hidden" name="deal_id" value={params.dealId} />
                          <input type="hidden" name="property_id" value={property.id} />
                          <input type="hidden" name="status" value="selected" />
                          <PendingButton className="press-sm rounded-md bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-800" pendingLabel="...">
                            <IconCheck className="h-3.5 w-3.5" />
                            Selecionar
                          </PendingButton>
                        </form>
                        <form action={updateDealPropertyStatus}>
                          <input type="hidden" name="deal_id" value={params.dealId} />
                          <input type="hidden" name="property_id" value={property.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <PendingButton className="press-sm rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2" pendingLabel="...">
                            <IconX className="h-3.5 w-3.5" />
                            Ignorar
                          </PendingButton>
                        </form>
                      </div>
                    )}

                    {canManage && dealRow.contact_id && (
                      <form action={scheduleVisit} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                        <input type="hidden" name="contact_id" value={dealRow.contact_id} />
                        <input type="hidden" name="deal_id" value={params.dealId} />
                        <input type="hidden" name="property_id" value={property.id} />
                        <label className="block">
                          <span className="label">Agendar visita</span>
                          <input type="datetime-local" name="scheduled_at" required className="field mt-1" />
                        </label>
                        <PendingButton className="btn-secondary" pendingLabel="Agendando">
                          Agendar
                        </PendingButton>
                      </form>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <OffersSection
        dealId={params.dealId}
        contactId={dealRow.contact_id}
        properties={Array.from(propertyById.values()).map((p) => ({ id: p.id, title: p.title }))}
        offers={offers}
        canManage={canManage}
      />

      {collections.length > 0 && (
        <section className="real-estate-flat-section py-5 sm:py-6">
          <h2 className="mb-3 text-base font-semibold text-ink">Vitrines deste atendimento</h2>
          <ul className="space-y-2">
            {collections.map((collection) => (
              <li key={collection.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-ink">{collection.title}</span>
                <span className="text-xs font-bold text-ink-muted">
                  {collection.revoked_at ? "Revogada" : `${collection.view_count} visualizações`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href={`/painel/contatos/${dealRow.contact_id}`} className="nav-item inline-block text-sm font-semibold text-brand-700 hover:underline">
        Voltar para o cliente
      </Link>
    </div>
  );
}

