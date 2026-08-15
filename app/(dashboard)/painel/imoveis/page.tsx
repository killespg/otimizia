import Link from "next/link";
import { PropertyFilterChat } from "@/components/real-estate/PropertyFilterChat";
import { PropertySelectableList, type PropertyListRow } from "@/components/real-estate/PropertySelectableList";
import { RealEstatePageHeader } from "@/components/real-estate/real-estate-ui";
import {
  canManageRealEstate,
  canViewRealEstate,
  centsToReais,
  isRealEstateV2Enabled,
  propertyStatusLabel,
  propertyStatusTagClass,
  propertyTypeLabel,
  REAL_ESTATE_PROPERTY_STATUSES,
  REAL_ESTATE_PROPERTY_TYPES,
  transactionTypeLabel,
} from "@/lib/real-estate/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateProperty } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconBuilding, IconPlus, IconSearch } from "../icons";

const PAGE_SIZE = 24;

function propertyPriceLabel(property: Pick<RealEstateProperty, "price_cents" | "rent_price_cents">): string {
  if (property.price_cents !== null) return centsToReais(property.price_cents);
  if (property.rent_price_cents !== null) return `${centsToReais(property.rent_price_cents)}/mês`;
  return "Sob consulta";
}

export default async function ImoveisPage(
  props: {
    searchParams: Promise<{
      q?: string;
      status?: string;
      property_type?: string;
      transaction_type?: string;
      price_min?: string;
      price_max?: string;
      bedrooms_min?: string;
      neighborhood?: string;
      page?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);

  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "real_estate_broker") return <NotRealEstate />;

  const [orgRole, { data: membership }, { data: org }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin)) return <AccessDenied />;
  const v2Enabled = isRealEstateV2Enabled(org);
  const canManage = canManageRealEstate(membership?.job_role, isAdmin);

  // Desvio deliberado do padrão de contacts/pipeline (buscar tudo e filtrar
  // em useMemo no cliente): preço/quartos/bairro em centenas de imóveis não
  // escalam em memória do jeito que nome de contato escala.
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("real_estate_properties")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .eq("workspace_key", "real_estate_broker")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchParams.q) query = query.ilike("title", `%${searchParams.q}%`);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.property_type) query = query.eq("property_type", searchParams.property_type);
  if (searchParams.transaction_type) query = query.eq("transaction_type", searchParams.transaction_type);
  if (searchParams.price_min) query = query.gte("price_cents", Math.round(Number(searchParams.price_min) * 100));
  if (searchParams.price_max) query = query.lte("price_cents", Math.round(Number(searchParams.price_max) * 100));
  if (searchParams.bedrooms_min) query = query.gte("bedrooms", Number(searchParams.bedrooms_min));
  if (searchParams.neighborhood) query = query.ilike("address_neighborhood", `%${searchParams.neighborhood}%`);

  const { data: properties, count } = await query;
  const list = (properties ?? []) as RealEstateProperty[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Uma foto por imóvel (a de position 0) só para as linhas visíveis nesta
  // página — não a galeria inteira, que só importa dentro do imóvel.
  const coverByPropertyId = new Map<string, string>();
  if (list.length > 0) {
    const { data: coverRows } = await supabase
      .from("real_estate_property_media")
      .select("property_id, storage_path")
      .in("property_id", list.map((p) => p.id))
      .eq("position", 0);
    for (const row of coverRows ?? []) {
      coverByPropertyId.set(
        row.property_id as string,
        supabase.storage.from("property-photos").getPublicUrl(row.storage_path as string).data.publicUrl
      );
    }
  }

  const rows: PropertyListRow[] = list.map((property) => ({
    id: property.id,
    title: property.title,
    statusLabel: propertyStatusLabel(property.status),
    statusTagClass: propertyStatusTagClass(property.status),
    subtitle: [
      propertyTypeLabel(property.property_type),
      transactionTypeLabel(property.transaction_type),
      property.address_neighborhood,
    ]
      .filter(Boolean)
      .join(" · "),
    facts: `${property.bedrooms ?? "-"} qts · ${property.parking_spots ?? "-"} vagas`,
    priceLabel: propertyPriceLabel(property),
    coverUrl: coverByPropertyId.get(property.id),
  }));

  const advancedFilterCount = [
    searchParams.status,
    searchParams.property_type,
    searchParams.transaction_type,
    searchParams.price_min,
    searchParams.price_max,
    searchParams.bedrooms_min,
    searchParams.neighborhood,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <RealEstatePageHeader
        eyebrow="Imobiliário / Carteira"
        title="Imóveis"
        description="Cadastre, filtre e monte vitrines com os imóveis da sua carteira."
        action={<>
          {v2Enabled && (
            <>
              <Link href="/painel/imoveis/visitas" className="btn-secondary">
                Visitas
              </Link>
              <Link href="/painel/imoveis/mapa" className="btn-secondary">
                Mapa
              </Link>
              <Link href="/painel/imoveis/dashboard" className="btn-secondary">
                Dashboard
              </Link>
            </>
          )}
          <Link href="/painel/imoveis/novo" className="btn">
            <IconPlus className="h-4 w-4" />
            Novo imóvel
          </Link>
        </>}
      />

      <section className="ui-form-panel space-y-4 p-5">
        <PropertyFilterChat />
        <div>
          <p className="mb-3 text-xs font-medium text-ink-muted">
            Busque pelo título do imóvel ou abra os filtros avançados para refinar por status, tipo, preço, bairro ou
            quartos.
          </p>
          {/* key força remontagem quando a IA muda a URL via router.push (client-side),
              senão os defaultValue destes campos não-controlados ficam desatualizados —
              uma navegação GET normal (submit manual) já recarrega a página inteira e
              não precisa disso, mas a key não atrapalha esse caso. */}
          <form key={JSON.stringify(searchParams)} method="get" className="space-y-3">
            <div className="flex gap-2">
              <label className="relative flex-1">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  name="q"
                  placeholder="Buscar por título..."
                  defaultValue={searchParams.q ?? ""}
                  className="field pl-9"
                />
              </label>
              <button type="submit" className="btn-secondary shrink-0">
                Buscar
              </button>
            </div>

            <details className="filter-details" open={advancedFilterCount > 0}>
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-brand-700">
                <span>Filtros avançados</span>
                {advancedFilterCount > 0 && <span className="tag tag-brand">{advancedFilterCount}</span>}
                <svg viewBox="0 0 24 24" className="filter-chevron h-3.5 w-3.5" aria-hidden>
                  <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-3 lg:grid-cols-6">
                <select name="status" defaultValue={searchParams.status ?? ""} className="field">
                  <option value="">Status: todos</option>
                  {REAL_ESTATE_PROPERTY_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select name="property_type" defaultValue={searchParams.property_type ?? ""} className="field">
                  <option value="">Tipo: todos</option>
                  {REAL_ESTATE_PROPERTY_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select name="transaction_type" defaultValue={searchParams.transaction_type ?? ""} className="field">
                  <option value="">Transação: todas</option>
                  <option value="venda">Venda</option>
                  <option value="aluguel">Aluguel</option>
                  <option value="venda_aluguel">Venda ou aluguel</option>
                </select>
                <input name="price_min" type="number" placeholder="Preço mín." defaultValue={searchParams.price_min ?? ""} className="field" />
                <input name="price_max" type="number" placeholder="Preço máx." defaultValue={searchParams.price_max ?? ""} className="field" />
                <input name="neighborhood" placeholder="Bairro" defaultValue={searchParams.neighborhood ?? ""} className="field" />
                <input name="bedrooms_min" type="number" placeholder="Quartos (mín.)" defaultValue={searchParams.bedrooms_min ?? ""} className="field" />
                <button type="submit" className="btn-secondary">
                  Aplicar filtros
                </button>
                <Link href="/painel/imoveis" className="nav-item rounded-[var(--radius-inner)] border border-line bg-surface px-3 py-2 text-center text-xs font-semibold text-ink-soft hover:bg-surface-2">
                  Limpar tudo
                </Link>
              </div>
            </details>
          </form>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Resultado</h2>
          <span className="tag bg-surface-2 text-ink-muted">{count ?? 0} no total</span>
        </div>
        {list.length === 0 ? <EmptyProperties /> : <PropertySelectableList rows={rows} selectable={canManage} />}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-line px-5 py-4 text-xs font-bold text-ink-muted">
            Página {page} de {totalPages}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyProperties() {
  return (
    <div className="p-8 text-center">
      <IconBuilding className="mx-auto h-8 w-8 text-brand-700" />
      <p className="mt-3 text-sm font-semibold text-ink">Nenhum imóvel encontrado.</p>
      <p className="mt-1 text-sm font-medium text-ink-muted">Cadastre um imóvel ou ajuste os filtros.</p>
    </div>
  );
}

function AccessDenied() {
  return (
    <section className="panel max-w-xl p-6">
      <p className="text-sm font-semibold text-brand-700">Acesso restrito</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Sua função não acessa a carteira de imóveis.</h1>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">
        Peça a um sócio administrador para atribuir um cargo imobiliário à sua conta.
      </p>
    </section>
  );
}

function NotRealEstate() {
  return (
    <section className="panel max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-ink">Área imobiliária disponível no workspace de corretor de imóveis.</h1>
      <Link href="/painel" className="btn mt-4">
        Voltar ao painel
      </Link>
    </section>
  );
}

