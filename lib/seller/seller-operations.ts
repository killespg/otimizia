import type {
  SellerBusinessProfile,
  SellerModule,
  SellerSalesModel,
} from "@/lib/supabase/types";

export const SELLER_SALES_MODELS: Array<{
  value: SellerSalesModel;
  label: string;
  description: string;
  defaultModules: SellerModule[];
}> = [
  { value: "general", label: "Catálogo geral", description: "Produtos sem uma operação especializada.", defaultModules: ["catalog", "orders"] },
  { value: "fashion", label: "Moda, calçados e acessórios", description: "Coleções, tamanhos, cores, reservas e trocas.", defaultModules: ["catalog", "collections", "variants", "inventory", "orders", "delivery"] },
  { value: "durable", label: "Produtos com garantia", description: "Número de série, garantia e atendimento pós-venda.", defaultModules: ["catalog", "inventory", "orders", "warranties", "delivery"] },
  { value: "consumable", label: "Consumíveis e reposição", description: "Validade e previsão de recompra.", defaultModules: ["catalog", "inventory", "orders", "consumables", "delivery"] },
  { value: "made_to_order", label: "Produtos sob encomenda", description: "Personalização, sinal, produção e entrega.", defaultModules: ["catalog", "variants", "orders", "made_to_order", "delivery"] },
  { value: "commercial_representative", label: "Representação comercial", description: "Marcas, tabelas e comissões por produto.", defaultModules: ["catalog", "orders", "commissions", "delivery"] },
];

// Extra modules only unlock controls inside Produtos/Vendas. They never add
// a new root menu item — navigation stays Hoje, Clientes, Vendas, Produtos.
export const SELLER_MODULES: Array<{ value: SellerModule; label: string; description: string }> = [
  { value: "catalog", label: "Catálogo", description: "Produtos, preços e categorias." },
  { value: "collections", label: "Coleções", description: "Trocas de coleção sem perder o histórico." },
  { value: "variants", label: "Variações", description: "Tamanho, cor, voltagem e outras opções." },
  { value: "inventory", label: "Estoque", description: "Saldo, reservas e alertas de reposição." },
  { value: "orders", label: "Pedidos", description: "Itens e valores reais depois do fechamento." },
  { value: "warranties", label: "Garantias", description: "Prazo por item, série e chamados." },
  { value: "consumables", label: "Reposição", description: "Ciclo de recompra e validade." },
  { value: "made_to_order", label: "Encomendas", description: "Produção, sinal e prazo prometido." },
  { value: "commissions", label: "Comissões", description: "Percentuais previstos e recebidos." },
  { value: "delivery", label: "Entrega", description: "Retirada, entrega local e transportadora." },
];

export const DEFAULT_SELLER_PROFILE: Omit<SellerBusinessProfile, "org_id" | "created_at" | "updated_at"> = {
  workspace_key: "autonomous_seller",
  sales_models: ["general"],
  enabled_modules: ["catalog", "orders"],
  default_warranty_days: 0,
  low_stock_threshold: 3,
  allow_negative_stock: false,
};

export function sellerProfileWithDefaults(
  value: Partial<SellerBusinessProfile> | null | undefined,
): typeof DEFAULT_SELLER_PROFILE {
  const salesModels = validSalesModels(value?.sales_models);
  const enabledModules = validModules(value?.enabled_modules);
  return {
    workspace_key: "autonomous_seller",
    sales_models: salesModels.length ? salesModels : DEFAULT_SELLER_PROFILE.sales_models,
    enabled_modules: enabledModules.length ? enabledModules : DEFAULT_SELLER_PROFILE.enabled_modules,
    default_warranty_days: clampInteger(value?.default_warranty_days, 0, 3650, 0),
    low_stock_threshold: clampInteger(value?.low_stock_threshold, 0, 1_000_000, 3),
    allow_negative_stock: value?.allow_negative_stock === true,
  };
}

export function modulesForSalesModels(models: SellerSalesModel[]): SellerModule[] {
  const modules = new Set<SellerModule>(["catalog", "orders"]);
  for (const model of models) {
    SELLER_SALES_MODELS.find((item) => item.value === model)?.defaultModules.forEach((module) => modules.add(module));
  }
  return [...modules];
}

export function isWarrantyExpired(expiresOn: string, now = new Date()) {
  const end = new Date(`${expiresOn}T23:59:59`);
  return end.getTime() < now.getTime();
}

export function daysUntil(dateValue: string, now = new Date()) {
  const target = new Date(`${dateValue}T23:59:59`);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function validSalesModels(value: unknown): SellerSalesModel[] {
  const valid = new Set(SELLER_SALES_MODELS.map((item) => item.value));
  return Array.isArray(value) ? value.filter((item): item is SellerSalesModel => valid.has(item as SellerSalesModel)) : [];
}

function validModules(value: unknown): SellerModule[] {
  const valid = new Set(SELLER_MODULES.map((item) => item.value));
  return Array.isArray(value) ? value.filter((item): item is SellerModule => valid.has(item as SellerModule)) : [];
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

