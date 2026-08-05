import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleDollarSign, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { SellerPageHeader, SellerStatus, date, money, sellerOrderStatusLabel, sellerPaymentStatusLabel } from "@/components/seller/seller-ui";
import { isWarrantyExpired } from "@/lib/seller/seller-operations";
import { getSellerPageContext } from "@/lib/seller/seller-server";
import type { Contact, SellerOrder, SellerOrderItem, SellerWarranty } from "@/lib/supabase/types";
import { updateSellerOrder } from "../../operacao/actions";

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, orgId } = await getSellerPageContext();
  const [{ data: orderRow }, { data: itemRows }] = await Promise.all([
    supabase.from("seller_orders").select("*").eq("id", id).eq("org_id", orgId).maybeSingle(),
    supabase.from("seller_order_items").select("*").eq("order_id", id).eq("org_id", orgId).order("created_at"),
  ]);
  if (!orderRow) notFound();
  const order = orderRow as SellerOrder;
  const items = (itemRows ?? []) as SellerOrderItem[];
  const [{ data: contactRow }, { data: warrantyRows }] = await Promise.all([
    order.contact_id ? supabase.from("contacts").select("*").eq("id", order.contact_id).eq("org_id", orgId).maybeSingle() : Promise.resolve({ data: null }),
    items.length ? supabase.from("seller_warranties").select("*").eq("org_id", orgId).in("order_item_id", items.map((item) => item.id)) : Promise.resolve({ data: [] }),
  ]);
  const contact = contactRow as Contact | null;
  const warranties = (warrantyRows ?? []) as SellerWarranty[];
  const warrantyByItem = new Map(warranties.map((warranty) => [warranty.order_item_id, warranty]));
  const commissionTotal = items.reduce((sum, item) => sum + item.commission_cents, 0);

  return (
    <div className="mx-auto w-full max-w-[1450px] space-y-5">
      <Link href="/painel/pedidos" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/52 hover:text-white"><ArrowLeft size={15} /> Voltar aos pedidos</Link>
      <SellerPageHeader title={order.order_number} description={`Confirmado em ${date(order.confirmed_at || order.created_at)} · ${contact?.name ?? "Cliente não vinculado"}`} actions={<><SellerStatus tone={order.payment_status === "paid" ? "success" : order.payment_status === "partial" ? "warning" : "neutral"}>{sellerPaymentStatusLabel(order.payment_status)}</SellerStatus><SellerStatus tone={order.status === "completed" ? "success" : order.status === "cancelled" ? "danger" : order.status === "ready" ? "violet" : "neutral"}>{sellerOrderStatusLabel(order.status)}</SellerStatus></>} />

      <section className="overflow-hidden panel">
        <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">Itens do pedido</h2><p className="mt-1 text-xs text-od-text-3">Os nomes, preços e garantias abaixo são a fotografia do momento da venda.</p></header>
        <div className="hidden grid-cols-[minmax(14rem,1.5fr)_7rem_8rem_8rem_9rem] border-b border-white/[0.08] px-4 py-2 text-xs font-semibold text-od-text-3 lg:grid"><span>Produto</span><span>Quantidade</span><span>Preço</span><span>Subtotal</span><span>Garantia</span></div>
        <div className="divide-y divide-white/[0.08]">{items.map((item) => {
          const warranty = warrantyByItem.get(item.id);
          const expired = warranty ? isWarrantyExpired(warranty.expires_on) : false;
          return <div key={item.id} className="grid gap-2 px-4 py-4 lg:grid-cols-[minmax(14rem,1.5fr)_7rem_8rem_8rem_9rem] lg:items-center">
            <div><strong className="block text-sm font-semibold text-white/82">{item.product_name_snapshot}</strong><p className="mt-1 text-xs text-od-text-3">{[item.variant_snapshot, item.sku_snapshot, item.serial_number ? `Série ${item.serial_number}` : null].filter(Boolean).join(" · ") || "Produto principal"}</p>{item.customization_notes ? <p className="mt-2 border-l-2 border-od-accent/45 pl-2 text-xs leading-5 text-white/56">{item.customization_notes}</p> : null}<p className="mt-1.5 text-xs text-od-text-3">{[item.promised_on ? `Entrega prometida ${date(item.promised_on)}` : null, item.reorder_due_on ? `Recompra sugerida ${date(item.reorder_due_on)}` : null, item.commission_percent > 0 ? `Comissão ${item.commission_percent.toLocaleString("pt-BR")}% · ${money(item.commission_cents)}` : null].filter(Boolean).join(" · ")}</p></div>
            <span className="text-sm tabular-nums text-white/62"><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Quantidade</span>{item.quantity}</span><span className="text-sm tabular-nums text-white/62"><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Preço</span>{money(item.unit_price_cents)}</span><strong className="text-sm tabular-nums text-white/78"><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Subtotal</span>{money(item.line_total_cents)}</strong>
            <span><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Garantia</span>{warranty ? <Link href={`/painel/pos-venda?warranty=${warranty.id}#novo-chamado`}><SellerStatus tone={expired ? "danger" : "success"}>{expired ? "Vencida" : `Até ${date(warranty.expires_on)}`}</SellerStatus></Link> : <span className="text-xs text-od-text-3">Sem garantia</span>}</span>
          </div>;
        })}</div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel">
          <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">Atualizar andamento</h2><p className="mt-1 text-xs text-od-text-3">Pagamento e entrega são independentes: um pedido pode estar pago e ainda em preparação.</p></header>
          <form action={updateSellerOrder} className="grid gap-4 p-4 md:grid-cols-2">
            <input type="hidden" name="order_id" value={order.id} />
            <label><span className="label">Status do pedido</span><select name="status" defaultValue={order.status} className="field mt-1.5"><option value="confirmed">Confirmado</option><option value="preparing">Em preparação</option><option value="ready">Pronto</option><option value="delivered">Entregue</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></label>
            <label><span className="label">Pagamento</span><select name="payment_status" defaultValue={order.payment_status} className="field mt-1.5"><option value="pending">Pendente</option><option value="partial">Parcial</option><option value="paid">Pago</option><option value="refunded">Estornado</option></select></label>
            <label className="md:col-span-2"><span className="label">Observações</span><textarea name="notes" maxLength={2000} defaultValue={order.notes ?? ""} placeholder="Preparação, entrega ou pagamento" className="field mt-1.5" /></label>
            <div className="md:col-span-2 flex justify-end"><PendingButton className="btn" pendingLabel="Atualizando pedido">Salvar andamento</PendingButton></div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="panel p-4"><h2 className="text-sm font-semibold text-white">Valores</h2><dl className="mt-3 text-sm"><Row label="Subtotal" value={money(order.subtotal_cents)} /><Row label="Desconto" value={`− ${money(order.discount_cents)}`} /><Row label="Frete" value={money(order.shipping_cents)} />{commissionTotal > 0 ? <Row label="Comissão prevista" value={money(commissionTotal)} /> : null}<div className="mt-3 flex items-end justify-between gap-4 border-t border-white/[0.1] pt-4"><dt className="font-semibold text-white/54">Total</dt><dd className="text-xl font-semibold tabular-nums text-od-text">{money(order.total_cents)}</dd></div></dl></section>
          <section className="panel p-4"><h2 className="text-sm font-semibold text-white">Operação</h2><dl className="mt-3 divide-y divide-white/[0.07] text-sm"><IconRow icon={<CircleDollarSign size={15} />} label="Pagamento" value={sellerPaymentStatusLabel(order.payment_status)} /><IconRow icon={<Truck size={15} />} label="Entrega" value={deliveryLabel(order.delivery_method)} /><IconRow icon={<PackageCheck size={15} />} label="Pedido" value={sellerOrderStatusLabel(order.status)} /><IconRow icon={<ShieldCheck size={15} />} label="Garantias" value={String(warranties.length)} /></dl></section>
          {contact ? <section className="panel p-4"><h2 className="text-sm font-semibold text-white">Cliente</h2><p className="mt-3 text-sm font-semibold text-white/76">{contact.name}</p><p className="mt-1 text-xs text-od-text-3">{contact.phone || contact.email || "Sem contato informado"}</p><Link href={`/painel/contatos/${contact.id}`} className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-od-text-2">Abrir cliente</Link></section> : null}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 py-2"><dt className="text-od-text-3">{label}</dt><dd className="font-semibold tabular-nums text-white/72">{value}</dd></div>; }
function IconRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex min-h-11 items-center gap-3 py-2"><span className="text-od-text-2">{icon}</span><span className="min-w-0 flex-1 text-od-text-3">{label}</span><strong className="text-right text-xs font-semibold text-white/70">{value}</strong></div>; }
function deliveryLabel(value: string | null) { return ({ pickup: "Retirada", local_delivery: "Entrega local", carrier: "Transportadora", customer_address: "Endereço do cliente", digital: "Digital", other: "Outro" } as Record<string, string>)[value ?? ""] ?? "Não informada"; }
