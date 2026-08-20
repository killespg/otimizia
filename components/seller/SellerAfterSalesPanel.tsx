import Link from "next/link";
import { CalendarClock, ChevronRight, CircleCheck, Plus, ShieldCheck, Wrench } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { SellerEmptyState, SellerPageHeader, SellerStatus, SellerSummaryStrip, date, sellerClaimStatusLabel } from "@/components/seller/seller-ui";
import { daysUntil, isWarrantyExpired } from "@/lib/seller/seller-operations";
import { getSellerPageContext } from "@/lib/seller/seller-server";
import { sellerSalesHref, sellerSalesHrefWithParams } from "@/lib/seller/seller-sales";
import type { Contact, SellerOrderItem, SellerWarranty, SellerWarrantyClaim } from "@/lib/supabase/types";
import { createSellerWarrantyClaim, updateSellerWarrantyClaim } from "@/app/(dashboard)/painel/operacao/actions";

export async function SellerAfterSalesPanel({
  warranty,
  status,
  warranties: warrantiesFilter,
  claims: claimsFilter,
  embedded = false,
}: {
  warranty?: string;
  status?: string;
  warranties?: string;
  claims?: string;
  embedded?: boolean;
}) {
  const { supabase, orgId } = await getSellerPageContext();
  const [{ data: warrantyRows }, { data: claimRows }, { data: contactRows }] = await Promise.all([
    supabase.from("seller_warranties").select("*").eq("org_id", orgId).order("expires_on"),
    supabase.from("seller_warranty_claims").select("*").eq("org_id", orgId).order("opened_at", { ascending: false }),
    supabase.from("contacts").select("id,name,phone,email").eq("org_id", orgId).eq("workspace_key", "autonomous_seller"),
  ]);
  const warranties = (warrantyRows ?? []) as SellerWarranty[];
  const claims = (claimRows ?? []) as SellerWarrantyClaim[];
  const contacts = new Map(((contactRows ?? []) as Pick<Contact, "id" | "name" | "phone" | "email">[]).map((contact) => [contact.id, contact]));
  const { data: itemRows } = warranties.length
    ? await supabase.from("seller_order_items").select("*").eq("org_id", orgId).in("id", warranties.map((item) => item.order_item_id))
    : { data: [] };
  const items = new Map(((itemRows ?? []) as SellerOrderItem[]).map((item) => [item.id, item]));
  const claimCountByWarranty = claims.reduce<Map<string, number>>((map, claim) => map.set(claim.warranty_id, (map.get(claim.warranty_id) ?? 0) + 1), new Map());
  const active = warranties.filter((item) => item.status === "active" && !isWarrantyExpired(item.expires_on));
  const expiring = active.filter((item) => daysUntil(item.expires_on) <= 30);
  const expired = warranties.filter((item) => item.status === "active" && isWarrantyExpired(item.expires_on));
  const openClaims = claims.filter((claim) => !["resolved", "cancelled"].includes(claim.status));
  const selectedStatus = status ?? "";
  const filteredClaims = claims.filter((claim) => claimsFilter === "open" ? !["resolved", "cancelled"].includes(claim.status) : !selectedStatus || claim.status === selectedStatus);
  const filteredWarranties = warrantiesFilter === "expiring" ? expiring : warranties;
  const selectedWarranty = warranties.find((item) => item.id === warranty) ?? active[0] ?? warranties[0] ?? null;
  const claimHref = (id: string) => `${sellerSalesHrefWithParams("pos-venda", { warranty: id })}#novo-chamado`;

  return (
    <div className="space-y-5">
      {embedded ? null : (
        <SellerPageHeader title="Pós-venda" description="Garantias por item vendido, números de série e atendimentos de troca, assistência ou reembolso." actions={<Link href="#novo-chamado" className="btn"><Plus size={16} /> Abrir atendimento</Link>} />
      )}
      <SellerSummaryStrip items={[
        { label: "Garantias ativas", value: active.length, tone: "success" },
        { label: "Vencem em 30 dias", value: expiring.length, tone: expiring.length ? "warning" : "default" },
        { label: "Garantias vencidas", value: expired.length },
        { label: "Atendimentos abertos", value: openClaims.length, tone: openClaims.length ? "warning" : "default" },
        { label: "Na assistência", value: claims.filter((claim) => claim.status === "assistance").length },
        { label: "Resolvidos", value: claims.filter((claim) => claim.status === "resolved").length, tone: "success" },
      ]} />

      {warranties.length === 0 ? <SellerEmptyState title="Nenhuma garantia emitida" description="Ao fechar uma venda com prazo de garantia, o sistema criará automaticamente uma garantia ligada ao item e ao cliente." action={<Link href={sellerSalesHref()} className="btn">Fechar uma venda</Link>} icon="box" /> : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
          <section className="overflow-hidden rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
            <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">Garantias emitidas</h2><p className="mt-1 text-xs text-od-text-3">O vencimento é calculado pela data, sem depender de um status que pode ficar desatualizado.</p></header>
            <div className="hidden grid-cols-[minmax(13rem,1.3fr)_minmax(10rem,1fr)_8rem_8rem_3rem] border-b border-white/[0.08] px-4 py-2 text-xs font-semibold text-od-text-3 lg:grid"><span>Produto</span><span>Cliente</span><span>Validade</span><span>Chamados</span><span /></div>
            <div className="divide-y divide-white/[0.08]">{filteredWarranties.map((item) => {
              const orderItem = items.get(item.order_item_id);
              const contact = item.contact_id ? contacts.get(item.contact_id) : null;
              const isExpired = isWarrantyExpired(item.expires_on);
              const days = daysUntil(item.expires_on);
              return <Link key={item.id} href={claimHref(item.id)} className="group grid min-h-16 gap-2 px-4 py-3 hover:bg-white/[0.025] lg:grid-cols-[minmax(13rem,1.3fr)_minmax(10rem,1fr)_8rem_8rem_3rem] lg:items-center">
                <span className="min-w-0"><strong className="block truncate text-sm font-semibold text-white/82">{orderItem?.product_name_snapshot ?? "Produto removido"}</strong><span className="mt-1 block truncate text-xs text-od-text-3">{[orderItem?.variant_snapshot, item.serial_number ? `Série ${item.serial_number}` : null].filter(Boolean).join(" · ") || "Sem série"}</span></span>
                <span className="min-w-0"><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Cliente</span><strong className="block truncate text-sm font-medium text-white/66">{contact?.name ?? "Cliente não vinculado"}</strong><span className="mt-1 block truncate text-xs text-od-text-3">{contact?.phone || contact?.email || "Sem contato"}</span></span>
                <span><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Validade</span><SellerStatus tone={isExpired ? "danger" : days <= 30 ? "warning" : "success"}>{isExpired ? "Vencida" : date(item.expires_on)}</SellerStatus></span>
                <span className="text-sm font-semibold tabular-nums text-white/62"><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Chamados</span>{claimCountByWarranty.get(item.id) ?? 0}</span>
                <ChevronRight size={15} className="hidden text-od-text-3 group-hover:text-od-text lg:block" />
              </Link>;
            })}</div>
          </section>

          <section id="novo-chamado" className="scroll-mt-24 rounded-[var(--radius-panel)] border border-od-accent/20 bg-[#1e1d22]/90">
            <header className="border-b border-od-accent/15 px-4 py-4"><div className="flex items-center gap-3"><Wrench size={18} className="text-od-text-2" /><div><h2 className="text-sm font-semibold text-white">Abrir atendimento</h2><p className="mt-1 text-xs text-od-text-3">Registre o problema e acompanhe até a solução.</p></div></div></header>
            <form action={createSellerWarrantyClaim} className="space-y-3 p-4">
              <label><span className="label">Garantia</span><select name="warranty_id" defaultValue={selectedWarranty?.id ?? ""} required className="field mt-1.5"><option value="" disabled>Selecione a garantia</option>{warranties.map((item) => { const orderItem = items.get(item.order_item_id); const contact = item.contact_id ? contacts.get(item.contact_id) : null; return <option key={item.id} value={item.id}>{orderItem?.product_name_snapshot ?? "Produto"} · {contact?.name ?? "Sem cliente"} · {date(item.expires_on)}</option>; })}</select></label>
              <label><span className="label">Assunto</span><input name="title" required maxLength={160} placeholder="Ex: Produto parou de funcionar" className="field mt-1.5" /></label>
              <label><span className="label">Descrição do problema</span><textarea name="issue_description" required maxLength={4000} placeholder="O que aconteceu, quando começou e como o produto está agora" className="field mt-1.5" /></label>
              <PendingButton className="btn w-full" pendingLabel="Abrindo atendimento">Abrir atendimento</PendingButton>
            </form>
          </section>
        </div>
      )}

      <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
        <header className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-white">Atendimentos</h2><p className="mt-1 text-xs text-od-text-3">Fila de análise, assistência, troca e reembolso.</p></div><form action="/painel/vendas" className="flex gap-2"><input type="hidden" name="tab" value="pos-venda" />{warrantiesFilter ? <input type="hidden" name="warranties" value={warrantiesFilter} /> : null}<select name="status" defaultValue={claimsFilter === "open" ? "open" : selectedStatus} className="field min-w-52 text-sm" aria-label="Filtrar atendimentos"><option value="">Todos os status</option><option value="open">Abertos</option><option value="analysis">Em análise</option><option value="assistance">Na assistência</option><option value="replacement_approved">Troca aprovada</option><option value="refund_approved">Reembolso aprovado</option><option value="resolved">Resolvidos</option><option value="cancelled">Cancelados</option></select><button type="submit" className="btn-secondary">Filtrar</button></form></header>
        {claims.length === 0 ? <SellerEmptyState title="Nenhum atendimento aberto" description="Quando um cliente relatar um problema, abra o chamado usando a garantia correspondente." /> : <div className="divide-y divide-white/[0.08]">{filteredClaims.map((claim) => {
          const item = warranties.find((entry) => entry.id === claim.warranty_id);
          const orderItem = item ? items.get(item.order_item_id) : null;
          return <article key={claim.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(12rem,.8fr)_minmax(16rem,1.4fr)_minmax(22rem,1fr)]">
            <div><div className="flex items-center gap-2"><SellerStatus tone={claim.status === "resolved" ? "success" : claim.status === "cancelled" ? "neutral" : claim.status === "assistance" ? "warning" : "violet"}>{sellerClaimStatusLabel(claim.status)}</SellerStatus></div><h3 className="mt-3 text-sm font-semibold text-white/82">{claim.title}</h3><p className="mt-1 text-xs text-od-text-3">{orderItem?.product_name_snapshot ?? "Produto removido"} · aberto em {date(claim.opened_at)}</p></div>
            <p className="text-sm leading-relaxed text-white/58">{claim.issue_description}</p>
            <form action={updateSellerWarrantyClaim} className="grid gap-3 sm:grid-cols-[minmax(10rem,.7fr)_minmax(12rem,1fr)_auto] sm:items-end xl:grid-cols-1">
              <input type="hidden" name="claim_id" value={claim.id} />
              <label><span className="label">Status</span><select name="status" defaultValue={claim.status} className="field mt-1.5"><option value="open">Aberto</option><option value="analysis">Em análise</option><option value="assistance">Na assistência</option><option value="replacement_approved">Troca aprovada</option><option value="refund_approved">Reembolso aprovado</option><option value="resolved">Resolvido</option><option value="cancelled">Cancelado</option></select></label>
              <label><span className="label">Solução / andamento</span><input name="resolution" maxLength={3000} defaultValue={claim.resolution ?? ""} placeholder="Ex: Enviado para assistência" className="field mt-1.5" /></label>
              <PendingButton className="btn-secondary" pendingLabel="Atualizando">Salvar</PendingButton>
            </form>
          </article>;
        })}</div>}
      </section>

      <section className="grid border-y border-white/[0.08] sm:grid-cols-3"><Guide icon={<ShieldCheck size={17} />} title="Garantia por item" text="O prazo vendido fica preservado mesmo se o cadastro do produto mudar." /><Guide icon={<CalendarClock size={17} />} title="Vencimento derivado" text="Ativa, próxima do fim ou vencida é calculado pela data real." /><Guide icon={<CircleCheck size={17} />} title="Histórico completo" text="Cada problema mantém status, relato e solução registrada." /></section>
    </div>
  );
}

function Guide({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="border-b border-white/[0.08] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="text-od-text-2">{icon}</span><h2 className="mt-3 text-sm font-semibold text-white/72">{title}</h2><p className="mt-1 text-xs leading-relaxed text-od-text-3">{text}</p></div>; }
