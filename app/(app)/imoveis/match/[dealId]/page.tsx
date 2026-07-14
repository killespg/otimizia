import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { canManageRealEstate, canViewRealEstate, isRealEstateV2Enabled, propertyTypeLabel } from "@/lib/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateDealProperty, RealEstateLeadPreferences, RealEstateProperty } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconCheck, IconX } from "../../../icons";
import { recalculateDealMatches, updateDealPropertyStatus } from "../../match-actions";

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

export default async function MatchPage({ params }: { params: { dealId: string } }) {
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

  const [orgRole, { data: membership }, { data: org }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin) || !isRealEstateV2Enabled(org)) notFound();
  const canManage = canManageRealEstate(membership?.job_role, isAdmin);

  const [{ data: dealRow }, { data: preferencesRow }, { data: matchRows }] = await Promise.all([
    supabase.from("deals").select("id, title, contact_id").eq("id", params.dealId).eq("org_id", orgId).maybeSingle(),
    supabase.from("real_estate_lead_preferences").select("*").eq("org_id", orgId).eq("deal_id", params.dealId).maybeSingle(),
    supabase
      .from("real_estate_deal_properties")
      .select("*")
      .eq("org_id", orgId)
      .eq("deal_id", params.dealId)
      .order("match_score", { ascending: false, nullsFirst: false }),
  ]);
  if (!dealRow) notFound();
  const preferences = preferencesRow as RealEstateLeadPreferences | null;
  const matches = (matchRows ?? []) as RealEstateDealProperty[];

  const propertyIds = matches.map((m) => m.property_id);
  const { data: propertyRows } =
    propertyIds.length > 0
      ? await supabase.from("real_estate_properties").select("*").eq("org_id", orgId).in("id", propertyIds)
      : { data: [] as RealEstateProperty[] };
  const propertyById = new Map(((propertyRows ?? []) as RealEstateProperty[]).map((p) => [p.id, p]));

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Atendimento</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
          Imóveis compatíveis com {dealRow.title}
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
          Score determinístico contra a carteira ativa — cada critério mostra o motivo, não só o número.
        </p>
      </header>

      {!preferences ? (
        <section className="panel p-5 sm:p-6">
          <p className="text-sm font-bold text-ink">
            Este atendimento ainda não tem preferências de busca definidas.{" "}
            <Link href={`/contacts/${dealRow.contact_id}`} className="nav-item text-brand-700 hover:underline">
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
            <section className="panel p-5 sm:p-6">
              <p className="text-sm font-medium text-ink-muted">
                Nenhum match calculado ainda. Clique em &quot;Recalcular matches&quot; pra comparar a carteira ativa com as preferências do cliente.
              </p>
            </section>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                const property = propertyById.get(match.property_id);
                if (!property) return null;
                return (
                  <section key={match.id} className="panel space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/imoveis/${property.id}`} className="nav-item text-sm font-black text-brand-700 hover:underline">
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
                          <PendingButton className="press-sm rounded-md bg-brand-700 px-2.5 py-1 text-xs font-black text-white hover:bg-brand-800" pendingLabel="...">
                            <IconCheck className="h-3.5 w-3.5" />
                            Selecionar
                          </PendingButton>
                        </form>
                        <form action={updateDealPropertyStatus}>
                          <input type="hidden" name="deal_id" value={params.dealId} />
                          <input type="hidden" name="property_id" value={property.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <PendingButton className="press-sm rounded-md border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2" pendingLabel="...">
                            <IconX className="h-3.5 w-3.5" />
                            Ignorar
                          </PendingButton>
                        </form>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <Link href={`/contacts/${dealRow.contact_id}`} className="nav-item inline-block text-sm font-black text-brand-700 hover:underline">
        Voltar para o cliente
      </Link>
    </div>
  );
}
