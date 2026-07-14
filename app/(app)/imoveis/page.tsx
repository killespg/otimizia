import Link from "next/link";
import {
  canViewRealEstate,
  propertyStatusLabel,
  propertyTypeLabel,
  REAL_ESTATE_PROPERTY_STATUSES,
  REAL_ESTATE_PROPERTY_TYPES,
  transactionTypeLabel,
} from "@/lib/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateProperty } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconBuilding, IconPlus } from "../icons";

const PAGE_SIZE = 24;

function centsToReais(cents: number | null): string {
  if (cents === null) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    property_type?: string;
    transaction_type?: string;
    price_min?: string;
    price_max?: string;
    bedrooms_min?: string;
    neighborhood?: string;
    page?: string;
  };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);

  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "real_estate_broker") return <NotRealEstate />;

  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin)) return <AccessDenied />;

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

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Carteira</p>
          <h1 className="mt-2 text-[clamp(1.7rem,5vw,3.1rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            Imóveis
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ink-soft">
            Cadastre, filtre e monte vitrines com os imóveis da sua carteira.
          </p>
        </div>
        <Link href="/imoveis/novo" className="btn shrink-0">
          <IconPlus className="h-4 w-4" />
          Novo imóvel
        </Link>
      </header>

      <section className="panel p-4 sm:p-5">
        <form className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6" method="get">
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
          <button type="submit" className="btn-soft">
            Filtrar
          </button>
          <Link href="/imoveis" className="nav-item rounded-md border border-line bg-white px-3 py-2 text-center text-xs font-black text-ink-soft hover:bg-surface-2">
            Limpar
          </Link>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-black text-ink">Resultado</h2>
          <span className="tag bg-surface-2 text-ink-muted">{count ?? 0} no total</span>
        </div>
        {list.length === 0 ? (
          <EmptyProperties />
        ) : (
          <div className="divide-y divide-line">
            {list.map((property) => (
              <Link
                key={property.id}
                href={`/imoveis/${property.id}`}
                className="nav-item grid gap-3 px-5 py-4 hover:bg-brand-50 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink">{property.title}</p>
                  <p className="mt-1 truncate text-xs font-bold text-ink-muted">
                    {propertyTypeLabel(property.property_type)} · {transactionTypeLabel(property.transaction_type)}
                    {property.address_neighborhood ? ` · ${property.address_neighborhood}` : ""}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-black text-ink-soft">
                  {propertyStatusLabel(property.status)}
                </span>
                <span className="text-xs font-black text-ink">{centsToReais(property.price_cents)}</span>
                <span className="text-xs font-bold text-ink-muted">
                  {property.bedrooms ?? "-"} qts · {property.parking_spots ?? "-"} vagas
                </span>
              </Link>
            ))}
          </div>
        )}
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
      <p className="mt-3 text-sm font-black text-ink">Nenhum imóvel encontrado.</p>
      <p className="mt-1 text-sm font-medium text-ink-muted">Cadastre um imóvel ou ajuste os filtros.</p>
    </div>
  );
}

function AccessDenied() {
  return (
    <section className="panel max-w-xl p-6">
      <p className="text-sm font-black text-brand-700">Acesso restrito</p>
      <h1 className="mt-2 text-2xl font-black text-ink">Sua função não acessa a carteira de imóveis.</h1>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">
        Peça a um sócio administrador para atribuir um cargo imobiliário à sua conta.
      </p>
    </section>
  );
}

function NotRealEstate() {
  return (
    <section className="panel max-w-xl p-6">
      <h1 className="text-2xl font-black text-ink">Área imobiliária disponível no workspace de corretor de imóveis.</h1>
      <Link href="/dashboard" className="btn mt-4">
        Voltar ao painel
      </Link>
    </section>
  );
}
