import Link from "next/link";
import { PendingButton } from "@/components/ui/PendingButton";
import type { RealEstateOffer, RealEstateProperty } from "@/lib/supabase/types";
import { acceptOffer, counterOffer, createOffer, declineOffer, sendOffer } from "../../offer-actions";

const OFFER_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  viewed: "Vista",
  countered: "Superada por contraproposta",
  accepted: "Aceita",
  declined: "Recusada",
  expired: "Expirada",
};

function centsToReais(cents: number | null): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// RE-4xx (Fase 4): PDF simples da proposta = a própria página de detalhe
// (/imoveis/propostas/[id]/pdf), estilizada pra impressão — "imprimir /
// salvar como PDF" do navegador em vez de um gerador de PDF no servidor
// (evita puxar uma dependência pesada tipo headless Chrome pro Vercel só
// pra isso; ver decisão registrada no commit).
export function OffersSection({
  dealId,
  contactId,
  properties,
  offers,
  canManage,
}: {
  dealId: string;
  contactId: string | null;
  properties: Pick<RealEstateProperty, "id" | "title">[];
  offers: RealEstateOffer[];
  canManage: boolean;
}) {
  const byParent = new Map<string, RealEstateOffer[]>();
  for (const offer of offers) {
    if (!offer.parent_offer_id) continue;
    byParent.set(offer.parent_offer_id, [...(byParent.get(offer.parent_offer_id) ?? []), offer]);
  }
  const roots = offers.filter((o) => !o.parent_offer_id);

  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">Propostas</h2>

      {roots.length === 0 ? (
        <p className="text-sm font-medium text-ink-muted">Nenhuma proposta registrada ainda.</p>
      ) : (
        <div className="divide-y divide-white/[0.08] border-y border-od-border">
          {roots.map((offer) => (
            <OfferThread key={offer.id} offer={offer} chain={byParent.get(offer.id) ?? []} canManage={canManage} />
          ))}
        </div>
      )}

      {canManage && contactId && properties.length > 0 && (
        <form action={createOffer} className="grid gap-2.5 border-t border-line pt-4 sm:grid-cols-2">
          <input type="hidden" name="deal_id" value={dealId} />
          <input type="hidden" name="contact_id" value={contactId} />
          <label className="block sm:col-span-2">
            <span className="label">Imóvel</span>
            <select name="property_id" required className="field mt-1">
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Valor da proposta (R$)</span>
            <input name="amount" required className="field mt-1" />
          </label>
          <label className="block">
            <span className="label">Entrada (R$)</span>
            <input name="down_payment" className="field mt-1" />
          </label>
          <label className="block">
            <span className="label">Valor financiado (R$)</span>
            <input name="financing_amount" className="field mt-1" />
          </label>
          <label className="block">
            <span className="label">Válida até</span>
            <input type="date" name="expires_at" className="field mt-1" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Condições de pagamento</span>
            <input name="payment_terms" className="field mt-1" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Outras condições</span>
            <textarea name="conditions" rows={2} className="field mt-1 min-h-[64px] resize-y" />
          </label>
          <div className="sm:col-span-2">
            <PendingButton className="btn-secondary" pendingLabel="Criando">
              Criar proposta (rascunho)
            </PendingButton>
          </div>
        </form>
      )}
    </section>
  );
}

function OfferThread({ offer, chain, canManage }: { offer: RealEstateOffer; chain: RealEstateOffer[]; canManage: boolean }) {
  const latest = chain.length > 0 ? chain[chain.length - 1] : offer;
  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{centsToReais(offer.amount_cents)}</p>
        <div className="flex items-center gap-2">
          <span className="tag bg-surface-2 text-ink-muted">{OFFER_STATUS_LABEL[offer.status]}</span>
          <Link href={`/painel/imoveis/propostas/${offer.id}/pdf`} className="nav-item text-xs font-semibold text-brand-700 hover:underline">
            PDF
          </Link>
        </div>
      </div>
      {offer.payment_terms && <p className="mt-1 text-xs font-medium text-ink-soft">{offer.payment_terms}</p>}
      {chain.map((counter) => (
        <div key={counter.id} className="mt-2 ml-4 border-l-2 border-line pl-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Contraproposta: {centsToReais(counter.amount_cents)}</p>
            <span className="tag bg-surface-2 text-ink-muted">{OFFER_STATUS_LABEL[counter.status]}</span>
          </div>
        </div>
      ))}

      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          {latest.status === "draft" && (
            <form action={sendOffer}>
              <input type="hidden" name="offer_id" value={latest.id} />
              <PendingButton className="press-sm rounded-md bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-800" pendingLabel="...">
                Enviar
              </PendingButton>
            </form>
          )}
          {(latest.status === "sent" || latest.status === "viewed") && (
            <>
              <form action={acceptOffer}>
                <input type="hidden" name="offer_id" value={latest.id} />
                <PendingButton className="press-sm rounded-md bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-800" pendingLabel="...">
                  Aceitar
                </PendingButton>
              </form>
              <form action={declineOffer}>
                <input type="hidden" name="offer_id" value={latest.id} />
                <PendingButton className="press-sm rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2" pendingLabel="...">
                  Recusar
                </PendingButton>
              </form>
              <details className="w-full">
                <summary className="cursor-pointer text-xs font-bold text-brand-700">Registrar contraproposta</summary>
                <form action={counterOffer} className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="parent_offer_id" value={latest.id} />
                  <input name="amount" required placeholder="Novo valor (R$)" className="field" />
                  <input name="payment_terms" placeholder="Condições" className="field" />
                  <div className="sm:col-span-2">
                    <PendingButton className="btn-secondary" pendingLabel="Registrando">
                      Registrar
                    </PendingButton>
                  </div>
                </form>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  );
}
