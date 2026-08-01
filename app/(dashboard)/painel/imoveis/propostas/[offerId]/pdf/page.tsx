import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ui/PrintButton";
import { canViewRealEstate, isRealEstateV2Enabled } from "@/lib/real-estate/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateOffer } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

function centsToReais(cents: number | null): string {
  if (cents === null) return "A combinar";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function OfferPdfPage(props: { params: Promise<{ offerId: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin, name").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "real_estate_broker") notFound();

  const [orgRole, { data: membership }, { data: org }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("organizations").select("name, real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
  ]);
  if (!canViewRealEstate(membership?.job_role, orgRole === "admin") || !isRealEstateV2Enabled(org)) notFound();

  const { data: offerRow } = await supabase.from("real_estate_offers").select("*").eq("id", params.offerId).eq("org_id", orgId).maybeSingle();
  if (!offerRow) notFound();
  const offer = offerRow as RealEstateOffer;

  const [{ data: property }, { data: contact }] = await Promise.all([
    supabase.from("real_estate_properties").select("title, address_street, address_number, address_neighborhood, address_city, address_state").eq("id", offer.property_id).maybeSingle(),
    supabase.from("contacts").select("name, email, phone").eq("id", offer.contact_id).maybeSingle(),
  ]);

  const address = property
    ? [property.address_street, property.address_number, property.address_neighborhood, property.address_city, property.address_state].filter(Boolean).join(", ")
    : "";

  return (
    <div className="print-document mx-auto max-w-2xl space-y-6">
      <div className="print-hide flex justify-end">
        <PrintButton />
      </div>

      <header className="border-b border-line pb-4">
        <p className="text-sm font-semibold text-brand-700">{org?.name ?? "Proposta"}</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Proposta de {offer.status === "sent" || offer.status === "viewed" ? "compra" : "negociação"}</h1>
        <p className="mt-1 text-sm font-medium text-ink-muted">Gerada em {new Date(offer.created_at).toLocaleDateString("pt-BR")}</p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Imóvel</h2>
        <p className="mt-1 text-lg font-semibold text-ink">{property?.title ?? "—"}</p>
        {address && <p className="text-sm text-ink-soft">{address}</p>}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Cliente</h2>
        <p className="mt-1 text-base font-bold text-ink">{contact?.name ?? "—"}</p>
        <p className="text-sm text-ink-soft">{[contact?.email, contact?.phone].filter(Boolean).join(" · ")}</p>
      </section>

      <section className="rounded-lg border border-line p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Condições propostas</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold text-ink-muted">Valor</dt>
            <dd className="text-lg font-semibold text-ink">{centsToReais(offer.amount_cents)}</dd>
          </div>
          {offer.down_payment_cents !== null && (
            <div>
              <dt className="text-xs font-bold text-ink-muted">Entrada</dt>
              <dd className="text-base font-bold text-ink">{centsToReais(offer.down_payment_cents)}</dd>
            </div>
          )}
          {offer.financing_amount_cents !== null && (
            <div>
              <dt className="text-xs font-bold text-ink-muted">Valor financiado</dt>
              <dd className="text-base font-bold text-ink">{centsToReais(offer.financing_amount_cents)}</dd>
            </div>
          )}
          {offer.expires_at && (
            <div>
              <dt className="text-xs font-bold text-ink-muted">Válida até</dt>
              <dd className="text-base font-bold text-ink">{new Date(offer.expires_at).toLocaleDateString("pt-BR")}</dd>
            </div>
          )}
        </dl>
        {offer.payment_terms && (
          <p className="mt-3 text-sm text-ink-soft">
            <strong className="text-ink">Forma de pagamento:</strong> {offer.payment_terms}
          </p>
        )}
        {offer.conditions && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
            <strong className="text-ink">Condições:</strong> {offer.conditions}
          </p>
        )}
      </section>

      <Link href={`/painel/imoveis/match/${offer.deal_id}`} className="nav-item print-hide inline-block text-sm font-semibold text-brand-700 hover:underline">
        Voltar para o atendimento
      </Link>
    </div>
  );
}

