import Link from "next/link";
import { ChevronRight, CircleDollarSign, ClipboardList, PackageCheck, Search, Truck } from "lucide-react";
import { SellerEmptyState, SellerPageHeader, SellerStatus, SellerSummaryStrip, date, money, sellerOrderStatusLabel, sellerPaymentStatusLabel } from "@/components/seller/seller-ui";
import { getSellerPageContext } from "@/lib/seller-server";
import type { Contact, SellerOrder, SellerOrderItem } from "@/lib/supabase/types";

type OrderRow = SellerOrder & { seller_order_items: Pick<SellerOrderItem, "id" | "quantity">[] };

export default async function SellerOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { supabase, orgId } = await getSellerPageContext();
  const params = await searchParams;
  const [{ data: orderRows }, { data: contactRows }] = await Promise.all([
    supabase.from("seller_orders").select("*, seller_order_items(id,quantity)").eq("org_id", orgId).order("created_at", { ascending: false }).limit(300),
    supabase.from("contacts").select("id,name,company").eq("org_id", orgId).eq("workspace_key", "autonomous_seller"),
  ]);
  const orders = (orderRows ?? []) as OrderRow[];
  const contacts = new Map(((contactRows ?? []) as Pick<Contact, "id" | "name" | "company">[]).map((contact) => [contact.id, contact]));
  const query = (params.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const status = params.status ?? "";
  const filtered = orders.filter((order) => {
    const contact = order.contact_id ? contacts.get(order.contact_id) : null;
    const searchable = [order.order_number, contact?.name, contact?.company].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    const statusMatches = !status || (status === "open" ? !["completed", "cancelled"].includes(order.status) : order.status === status);
    return (!query || searchable.includes(query)) && statusMatches;
  });
  const open = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const pendingPayment = orders.filter((order) => !["paid", "refunded"].includes(order.payment_status) && order.status !== "cancelled");
  const revenue = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total_cents, 0);

  return (
    <div className="mx-auto w-full max-w-[1550px] space-y-5">
      <SellerPageHeader title="Pedidos" description="Acompanhe o que foi realmente vendido, o pagamento e a entrega. Pedidos nascem da confirmação de uma negociação." actions={<Link href="/painel/funil" className="btn"><ClipboardList size={16} /> Abrir funil</Link>} />
      <form className="flex flex-col gap-2 sm:flex-row" role="search"><label className="relative min-w-0 flex-1"><span className="sr-only">Buscar pedido</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-od-text-3" /><input name="q" defaultValue={params.q} placeholder="Buscar número do pedido ou cliente" className="field pl-10" /></label><select name="status" defaultValue={status} className="field sm:max-w-60" aria-label="Status do pedido"><option value="">Todos os status</option><option value="open">Em andamento</option><option value="confirmed">Confirmados</option><option value="preparing">Em preparação</option><option value="ready">Prontos</option><option value="delivered">Entregues</option><option value="completed">Concluídos</option><option value="cancelled">Cancelados</option></select><button className="btn-secondary" type="submit">Filtrar</button></form>
      <SellerSummaryStrip items={[
        { label: "Pedidos", value: orders.length },
        { label: "Em andamento", value: open.length },
        { label: "Aguardando pagamento", value: pendingPayment.length, tone: pendingPayment.length ? "warning" : "default" },
        { label: "Prontos para entrega", value: orders.filter((order) => order.status === "ready").length },
        { label: "Concluídos", value: orders.filter((order) => order.status === "completed").length, tone: "success" },
        { label: "Valor registrado", value: money(revenue) },
      ]} />

      {orders.length === 0 ? <SellerEmptyState title="Nenhum pedido confirmado" description="Mova uma negociação para Ganho. Antes de fechar, o sistema pedirá os itens e permitirá criar um produto na hora." action={<Link href="/painel/funil" className="btn">Abrir funil</Link>} icon="box" /> : (
        <section className="overflow-hidden border border-white/[0.09] bg-[#1e1d22]/90">
          <div className="hidden grid-cols-[9rem_minmax(12rem,1.4fr)_7rem_8rem_8rem_9rem_3rem] border-b border-white/[0.08] px-4 py-2 text-xs font-semibold text-od-text-3 lg:grid"><span>Pedido</span><span>Cliente</span><span>Itens</span><span>Total</span><span>Pagamento</span><span>Status</span><span /></div>
          {filtered.length ? <div className="divide-y divide-white/[0.08]">{filtered.map((order) => {
            const contact = order.contact_id ? contacts.get(order.contact_id) : null;
            const itemCount = order.seller_order_items.reduce((sum, item) => sum + item.quantity, 0);
            return <Link key={order.id} href={`/painel/pedidos/${order.id}`} className="group grid min-h-16 gap-2 px-4 py-3 hover:bg-white/[0.025] lg:grid-cols-[9rem_minmax(12rem,1.4fr)_7rem_8rem_8rem_9rem_3rem] lg:items-center">
              <span><strong className="block text-sm font-semibold text-od-text">{order.order_number}</strong><span className="mt-1 block text-xs text-od-text-3">{date(order.confirmed_at || order.created_at)}</span></span>
              <span className="min-w-0"><strong className="block truncate text-sm font-semibold text-white/78">{contact?.name ?? "Cliente não vinculado"}</strong><span className="mt-1 block truncate text-xs text-od-text-3">{contact?.company || "Venda direta"}</span></span>
              <span className="text-sm text-white/62"><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Itens</span><span className="flex items-center gap-2"><PackageCheck size={15} className="text-od-text-3" /> {itemCount}</span></span>
              <span className="text-sm font-semibold tabular-nums text-white/78"><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Total</span>{money(order.total_cents)}</span>
              <span><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Pagamento</span><SellerStatus tone={order.payment_status === "paid" ? "success" : order.payment_status === "partial" ? "warning" : "neutral"}>{sellerPaymentStatusLabel(order.payment_status)}</SellerStatus></span>
              <span><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Status</span><SellerStatus tone={order.status === "completed" ? "success" : order.status === "cancelled" ? "danger" : order.status === "ready" ? "violet" : "neutral"}>{sellerOrderStatusLabel(order.status)}</SellerStatus></span>
              <ChevronRight size={15} className="hidden text-od-text-3 group-hover:text-od-text lg:block" />
            </Link>;
          })}</div> : <SellerEmptyState title="Nenhum pedido encontrado" description="Revise a busca ou escolha outro status." icon="box" />}
        </section>
      )}

      <section className="grid border-y border-white/[0.08] sm:grid-cols-3"><Guide icon={<CircleDollarSign size={17} />} title="Pagamento" text="Marque como parcial, pago ou estornado sem alterar o valor histórico do pedido." /><Guide icon={<PackageCheck size={17} />} title="Preparação" text="Acompanhe confirmado, em preparação e pronto para retirada ou envio." /><Guide icon={<Truck size={17} />} title="Entrega" text="Finalize somente depois que o produto chegar ao cliente." /></section>
    </div>
  );
}

function Guide({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="border-b border-white/[0.08] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="text-od-text-2">{icon}</span><h2 className="mt-3 text-sm font-semibold text-white/72">{title}</h2><p className="mt-1 text-xs leading-relaxed text-od-text-3">{text}</p></div>; }
