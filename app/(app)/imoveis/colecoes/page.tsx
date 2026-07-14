import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { CopyShareLink } from "@/components/law/CopyShareLink";
import { canManageRealEstate, canViewRealEstate } from "@/lib/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstatePropertyReaction, RealEstateShareCollection } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconImage, IconPlus, IconTrash } from "../../icons";
import { removePropertyFromCollection, revokeShareCollection } from "../actions";

const REACTION_LABEL: Record<RealEstatePropertyReaction, string> = {
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
  quero_visitar: "Quer visitar",
};

export default async function ColecoesPage() {
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

  const collectionIds = collections.map((c) => c.id);
  const [{ data: itemRows }, { data: reactionRows }] = await Promise.all([
    collectionIds.length
      ? supabase
          .from("real_estate_share_collection_items")
          .select("collection_id, property_id, real_estate_properties(title)")
          .in("collection_id", collectionIds)
      : Promise.resolve({ data: [] }),
    collectionIds.length
      ? supabase
          .from("real_estate_property_reactions")
          .select("collection_id, property_id, reaction")
          .in("collection_id", collectionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const itemsByCollection = new Map<string, { property_id: string; title: string }[]>();
  for (const row of itemRows ?? []) {
    const list = itemsByCollection.get(row.collection_id as string) ?? [];
    const propertyRelation = row.real_estate_properties as unknown as { title: string } | null;
    list.push({ property_id: row.property_id as string, title: propertyRelation?.title ?? "Imóvel" });
    itemsByCollection.set(row.collection_id as string, list);
  }
  const reactionByPair = new Map<string, RealEstatePropertyReaction>();
  for (const row of reactionRows ?? []) {
    reactionByPair.set(`${row.collection_id}:${row.property_id}`, row.reaction as RealEstatePropertyReaction);
  }

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Compartilhamento</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            Vitrines
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-soft">
            Links públicos com uma seleção de imóveis — o cliente reage sem precisar de conta.
          </p>
        </div>
        {canManage && (
          <Link href="/imoveis/colecoes/nova" className="btn shrink-0">
            <IconPlus className="h-4 w-4" />
            Nova vitrine
          </Link>
        )}
      </header>

      {collections.length === 0 ? (
        <section className="panel p-8 text-center">
          <IconImage className="mx-auto h-8 w-8 text-brand-700" />
          <p className="mt-3 text-sm font-black text-ink">Nenhuma vitrine criada ainda.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {collections.map((collection) => {
            const items = itemsByCollection.get(collection.id) ?? [];
            const isRevoked = Boolean(collection.revoked_at);
            return (
              <section key={collection.id} className="panel overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-ink">{collection.title}</p>
                    <p className="mt-1 text-xs font-bold text-ink-muted">
                      {collection.view_count} visualizações
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
                            className="press-sm rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-danger-600 hover:bg-danger-50"
                            pendingLabel="Revogando"
                          >
                            Revogar
                          </PendingButton>
                        </form>
                      )}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-line">
                  {items.map((item) => {
                    const reaction = reactionByPair.get(`${collection.id}:${item.property_id}`);
                    return (
                      <div key={item.property_id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <Link href={`/imoveis/${item.property_id}`} className="truncate text-sm font-bold text-ink hover:text-brand-700">
                          {item.title}
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          {reaction && (
                            <span className="tag bg-brand-50 text-brand-700">{REACTION_LABEL[reaction]}</span>
                          )}
                          {canManage && (
                            <form action={removePropertyFromCollection}>
                              <input type="hidden" name="collection_id" value={collection.id} />
                              <input type="hidden" name="property_id" value={item.property_id} />
                              <button type="submit" className="icon-button grid h-8 w-8 place-items-center rounded-md text-ink-muted/60 hover:bg-danger-50 hover:text-danger-600">
                                <IconTrash className="h-4 w-4" />
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Link href="/imoveis" className="nav-item inline-block text-sm font-black text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}

