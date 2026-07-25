import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { CopyShareLink } from "@/components/law/CopyShareLink";
import { VitrineSearch } from "@/components/real-estate/VitrineSearch";
import { RealEstatePageHeader } from "@/components/real-estate/real-estate-ui";
import { canManageRealEstate, canViewRealEstate } from "@/lib/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateProperty, RealEstatePropertyReaction, RealEstateShareCollection } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconImage, IconPlus, IconTrash } from "../../icons";
import { removePropertyFromCollection, revokeShareCollection } from "../actions";

const REACTION_LABEL: Record<RealEstatePropertyReaction, string> = {
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
  quero_visitar: "Quer visitar",
};

// Selo de reação sobre a foto: fundo sólido pra ler em cima de qualquer
// imagem. Do mais quente (quer visitar = lead pronto) ao frio (sem interesse).
// Sem a classe global .tag de propósito — ela fica fora das @layer e
// sobreporia estas cores; aqui usamos só utilitários do Tailwind.
const REACTION_BADGE: Record<RealEstatePropertyReaction, string> = {
  quero_visitar: "bg-emerald-500 text-emerald-950",
  interessado: "bg-od-accent text-white",
  sem_interesse: "bg-black/55 text-white",
};

export default async function ColecoesPage() {
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

  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin)) notFound();
  const canManage = canManageRealEstate(membership?.job_role, isAdmin);

  const { data: collectionRows } = await supabase
    .from("real_estate_share_collections")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  const collections = (collectionRows ?? []) as RealEstateShareCollection[];

  // Nome do cliente ligado a cada vitrine — pra exibir no cabeçalho e permitir
  // buscar a "seleção da pessoa" sem rolar a lista inteira.
  const clientNameById = new Map<string, string>();
  const clientIds = Array.from(
    new Set(collections.map((c) => c.client_contact_id).filter((id): id is string => Boolean(id)))
  );
  if (clientIds.length > 0) {
    const { data: clientRows } = await supabase.from("contacts").select("id, name").in("id", clientIds);
    for (const row of clientRows ?? []) clientNameById.set(row.id as string, (row.name as string | null) ?? "");
  }

  const collectionIds = collections.map((c) => c.id);
  const [{ data: itemRows }, { data: reactionRows }] = await Promise.all([
    collectionIds.length
      ? supabase
          .from("real_estate_share_collection_items")
          .select(
            "collection_id, property_id, real_estate_properties(title, price_cents, rent_price_cents, transaction_type, address_neighborhood, address_city)"
          )
          .in("collection_id", collectionIds)
      : Promise.resolve({ data: [] }),
    collectionIds.length
      ? supabase
          .from("real_estate_property_reactions")
          .select("collection_id, property_id, reaction")
          .in("collection_id", collectionIds)
      : Promise.resolve({ data: [] }),
  ]);

  type ItemProperty = Pick<
    RealEstateProperty,
    "title" | "price_cents" | "rent_price_cents" | "transaction_type" | "address_neighborhood" | "address_city"
  >;
  type CollectionItem = ItemProperty & { property_id: string };

  const itemsByCollection = new Map<string, CollectionItem[]>();
  for (const row of itemRows ?? []) {
    const list = itemsByCollection.get(row.collection_id as string) ?? [];
    const p = row.real_estate_properties as unknown as ItemProperty | null;
    list.push({
      property_id: row.property_id as string,
      title: p?.title ?? "Imóvel",
      price_cents: p?.price_cents ?? null,
      rent_price_cents: p?.rent_price_cents ?? null,
      transaction_type: p?.transaction_type ?? "venda",
      address_neighborhood: p?.address_neighborhood ?? null,
      address_city: p?.address_city ?? null,
    });
    itemsByCollection.set(row.collection_id as string, list);
  }
  const reactionByPair = new Map<string, RealEstatePropertyReaction>();
  for (const row of reactionRows ?? []) {
    reactionByPair.set(`${row.collection_id}:${row.property_id}`, row.reaction as RealEstatePropertyReaction);
  }

  // Foto de capa (position 0) de cada imóvel presente nas vitrines — mesmo
  // padrão da tela de criação (bucket público property-photos).
  const coverByPropertyId = new Map<string, string>();
  const itemPropertyIds = Array.from(new Set((itemRows ?? []).map((r) => r.property_id as string)));
  if (itemPropertyIds.length > 0) {
    const { data: coverRows } = await supabase
      .from("real_estate_property_media")
      .select("property_id, storage_path")
      .in("property_id", itemPropertyIds)
      .eq("position", 0);
    for (const row of coverRows ?? []) {
      coverByPropertyId.set(
        row.property_id as string,
        supabase.storage.from("property-photos").getPublicUrl(row.storage_path as string).data.publicUrl
      );
    }
  }

  function formatItemPrice(item: CollectionItem): string | null {
    const isRent = item.transaction_type === "aluguel";
    const cents = isRent ? item.rent_price_cents ?? item.price_cents : item.price_cents ?? item.rent_price_cents;
    if (cents == null) return null;
    const value = (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
    return isRent ? `${value}/mês` : value;
  }

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-6">
      <RealEstatePageHeader eyebrow="Imobiliário / Compartilhamento" title="Vitrines" description="Links públicos com uma seleção de imóveis para o cliente avaliar sem precisar de conta." action={canManage ? (
          <Link href="/painel/imoveis/colecoes/nova" className="btn shrink-0">
            <IconPlus className="h-4 w-4" />
            Nova vitrine
          </Link>
        ) : null} />

      {collections.length > 2 ? <VitrineSearch /> : null}

      {collections.length === 0 ? (
        <section className="real-estate-flat-section p-8 text-center">
          <IconImage className="mx-auto h-8 w-8 text-brand-700" />
          <p className="mt-3 text-sm font-semibold text-ink">Nenhuma vitrine criada ainda.</p>
        </section>
      ) : (
        <>
          <div className="space-y-8">
          {collections.map((collection) => {
            const items = itemsByCollection.get(collection.id) ?? [];
            const isRevoked = Boolean(collection.revoked_at);
            const clientName = clientNameById.get(collection.client_contact_id ?? "") ?? "";
            return (
              // Vitrine = grupo. Uma hairline no topo marca onde cada uma
              // começa (flat, sem card); o título forte é a âncora e os imóveis
              // ficam indentados sob um trilho à esquerda, deixando claro que
              // pertencem a ela.
              <section
                key={collection.id}
                data-vitrine
                data-search={`${collection.title} ${clientName}`.toLowerCase()}
                className="border-t border-white/[0.07] pt-5 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={`truncate text-lg font-bold ${isRevoked ? "text-ink-muted line-through" : "text-ink"}`}>
                      {collection.title}
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                      {clientName ? <span className="text-brand-700">{clientName}</span> : null}
                      {clientName ? " · " : ""}
                      {collection.view_count} {collection.view_count === 1 ? "visualização" : "visualizações"}
                      {" · "}
                      {items.length} {items.length === 1 ? "imóvel" : "imóveis"}
                      {isRevoked ? " · Revogado" : ""}
                    </p>
                  </div>
                  {!isRevoked && (
                    <div className="flex items-center gap-2">
                      <CopyShareLink token={collection.token} basePath="/share/imoveis" />
                      {canManage && (
                        <form action={revokeShareCollection}>
                          <input type="hidden" name="id" value={collection.id} />
                          <PendingButton
                            className="press-sm rounded-md border border-line bg-surface px-3 py-2 text-xs font-bold text-danger-600 hover:bg-danger-50"
                            pendingLabel="Revogando"
                          >
                            Revogar
                          </PendingButton>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {items.length === 0 ? (
                  <p className="mt-3 ml-1 border-l border-line pl-4 py-2 text-xs font-medium text-ink-muted">
                    Nenhum imóvel nesta vitrine ainda.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                    {items.map((item) => {
                      const reaction = reactionByPair.get(`${collection.id}:${item.property_id}`);
                      const cover = coverByPropertyId.get(item.property_id);
                      const price = formatItemPrice(item);
                      const local = item.address_neighborhood || item.address_city;
                      return (
                        <div key={item.property_id} className="overflow-hidden rounded-md border border-line bg-surface">
                          <div className="relative aspect-[16/10] bg-white/[0.03]">
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-ink-muted/40">
                                <IconImage className="h-7 w-7" />
                              </div>
                            )}
                            {reaction && (
                              <span
                                className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-semibold ${REACTION_BADGE[reaction]}`}
                              >
                                {REACTION_LABEL[reaction]}
                              </span>
                            )}
                            {canManage && (
                              <form action={removePropertyFromCollection} className="absolute right-2 top-2">
                                <input type="hidden" name="collection_id" value={collection.id} />
                                <input type="hidden" name="property_id" value={item.property_id} />
                                <button
                                  type="submit"
                                  aria-label="Remover imóvel da vitrine"
                                  className="grid size-8 place-items-center rounded bg-black/45 text-white/85 hover:bg-danger-600 hover:text-white"
                                >
                                  <IconTrash className="h-4 w-4" />
                                </button>
                              </form>
                            )}
                          </div>
                          <div className="p-2.5 sm:p-3">
                            <Link
                              href={`/painel/imoveis/${item.property_id}`}
                              className="line-clamp-2 text-[13px] font-medium text-ink hover:text-brand-700 sm:text-sm"
                            >
                              {item.title}
                            </Link>
                            <div className="mt-1.5 flex flex-col gap-0.5 sm:mt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                              <span className="truncate text-xs text-ink-muted">{local ?? "—"}</span>
                              {price && <span className="text-[13px] font-semibold text-ink sm:text-sm">{price}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
          </div>
          <p id="vitrine-empty" style={{ display: "none" }} className="py-6 text-sm font-medium text-ink-muted">
            Nenhuma vitrine encontrada para essa busca.
          </p>
        </>
      )}

      <Link href="/painel/imoveis" className="nav-item inline-block text-sm font-semibold text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}
