"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import { SELLER_MODULES, SELLER_SALES_MODELS } from "@/lib/seller-operations";
import { createClient } from "@/lib/supabase/server";
import type { SellerModule, SellerSalesModel } from "@/lib/supabase/types";
import { parseWorkspacePreferences } from "@/lib/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspaces";

const PRODUCT_IMAGE_BUCKET = "seller-product-images";
const PRODUCT_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const PRODUCT_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function requireSeller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const [{ data: profile }, access] = await Promise.all([
    supabase.from("profiles").select("profession_type,is_admin").eq("id", user.id).maybeSingle(),
    getUserPlanAccess(supabase, user.id, orgId),
  ]);
  if (!access.hasAccess) redirect("/upgrade");
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "autonomous_seller") throw new Error("Este recurso pertence ao workspace de vendas.");
  const role = await getOrgRole(supabase, orgId, user.id);
  if (!role) throw new Error("Você não faz parte desta empresa.");
  return { supabase, user, orgId, isOrgAdmin: role === "admin" };
}

export type UpdateSellerBusinessProfileState = { error: string | null };

export async function updateSellerBusinessProfile(
  _previousState: UpdateSellerBusinessProfileState,
  formData: FormData,
): Promise<UpdateSellerBusinessProfileState> {
  const { supabase, orgId, isOrgAdmin } = await requireSeller();
  if (!isOrgAdmin) throw new Error("Somente a administração pode configurar a operação.");
  const validModels = new Set(SELLER_SALES_MODELS.map((item) => item.value));
  const validModules = new Set(SELLER_MODULES.map((item) => item.value));
  const salesModels = unique(formData.getAll("sales_models").map(String))
    .filter((value): value is SellerSalesModel => validModels.has(value as SellerSalesModel));
  const enabledModules = unique(formData.getAll("enabled_modules").map(String))
    .filter((value): value is SellerModule => validModules.has(value as SellerModule));
  if (salesModels.length === 0) salesModels.push("general");
  if (!enabledModules.includes("catalog")) enabledModules.unshift("catalog");
  if (!enabledModules.includes("orders")) enabledModules.push("orders");

  const sellerOperation = {
    sales_models: salesModels,
    enabled_modules: enabledModules,
    default_warranty_days: integer(formData.get("default_warranty_days"), 0, 3650, 0),
    low_stock_threshold: integer(formData.get("low_stock_threshold"), 0, 1_000_000, 3),
    allow_negative_stock: formData.get("allow_negative_stock") === "on",
  };

  const { data: organization, error: readError } = await supabase.from("organizations")
    .select("workspace_preferences").eq("id", orgId).maybeSingle();
  if (readError || !organization) return { error: "Não foi possível abrir as configurações da empresa." };
  const preferences = parseWorkspacePreferences(organization.workspace_preferences);
  const nextPreferences = {
    ...preferences,
    autonomous_seller: {
      ...preferences.autonomous_seller,
      sellerOperation,
    },
  };
  const { error: preferenceError } = await supabase.from("organizations")
    .update({ workspace_preferences: nextPreferences }).eq("id", orgId);
  if (preferenceError) return { error: "Não foi possível salvar a configuração. Tente novamente." };

  // Mantém a tabela especializada sincronizada quando a migração já estiver
  // disponível. A preferência da organização é a base compatível durante o deploy.
  await supabase.from("seller_business_profiles").upsert({
    org_id: orgId,
    workspace_key: "autonomous_seller",
    ...sellerOperation,
  }, { onConflict: "org_id,workspace_key" });
  revalidateSeller();
  redirect("/painel/operacao/configuracoes?salvo=1");
}

export async function createSellerCollection(formData: FormData) {
  const { supabase, user, orgId } = await requireSeller();
  const { data, error } = await supabase.from("seller_collections").insert({
    org_id: orgId,
    workspace_key: "autonomous_seller",
    name: required(formData.get("name"), "Nome da coleção", 120),
    status: collectionStatus(formData.get("status")),
    starts_on: dateOrNull(formData.get("starts_on")),
    ends_on: dateOrNull(formData.get("ends_on")),
    description: optional(formData.get("description"), 1000),
    created_by: user.id,
  }).select("id").single();
  ensure(error, "Não foi possível criar a coleção.");
  revalidateSeller();
  redirect(safeReturn(formData.get("return_to"), data?.id ? `/painel/colecoes#${data.id}` : "/painel/colecoes"));
}

export async function updateSellerCollectionStatus(formData: FormData) {
  const { supabase, orgId } = await requireSeller();
  const id = uuid(formData.get("collection_id"), "Coleção");
  const { error } = await supabase.from("seller_collections")
    .update({ status: collectionStatus(formData.get("status")) })
    .eq("id", id).eq("org_id", orgId);
  ensure(error, "Não foi possível atualizar a coleção.");
  revalidateSeller();
}

export async function switchSellerCollection(formData: FormData) {
  const { supabase, orgId } = await requireSeller();
  const previousId = optionalUuid(formData.get("previous_collection_id"));
  const carryProductIds = unique(formData.getAll("product_ids").map(String)).filter(isUuid);
  const { data: nextCollectionId, error } = await supabase.rpc("switch_seller_collection", {
    p_org_id: orgId,
    p_name: required(formData.get("name"), "Nova coleção", 120),
    p_starts_on: dateOrNull(formData.get("starts_on")),
    p_ends_on: dateOrNull(formData.get("ends_on")),
    p_description: optional(formData.get("description"), 1000),
    p_previous_collection_id: previousId,
    p_product_ids: carryProductIds,
  });
  ensure(error, "Não foi possível criar a nova coleção.");
  if (!isUuid(String(nextCollectionId ?? ""))) throw new Error("A nova coleção não foi criada.");
  revalidateSeller();
  redirect("/painel/colecoes?trocada=1");
}

export async function createSellerProduct(formData: FormData) {
  const { supabase, user, orgId } = await requireSeller();
  const stock = integer(formData.get("stock_quantity"), -1_000_000, 1_000_000, 0);
  const { data: product, error } = await supabase.from("seller_products").insert({
    org_id: orgId,
    workspace_key: "autonomous_seller",
    collection_id: optionalUuid(formData.get("collection_id")),
    name: required(formData.get("name"), "Nome do produto", 160),
    sku: optional(formData.get("sku"), 80),
    category: optional(formData.get("category"), 80),
    brand: optional(formData.get("brand"), 120),
    kind: productKind(formData.get("kind")),
    status: productStatus(formData.get("status")),
    description: optional(formData.get("description"), 3000),
    base_price_cents: moneyToCents(formData.get("base_price")),
    cost_cents: optionalMoneyToCents(formData.get("cost")),
    track_stock: formData.get("track_stock") === "on",
    stock_quantity: stock,
    low_stock_threshold: optionalInteger(formData.get("low_stock_threshold"), 0, 1_000_000),
    warranty_days: integer(formData.get("warranty_days"), 0, 3650, 0),
    requires_serial: formData.get("requires_serial") === "on",
    reorder_interval_days: optionalInteger(formData.get("reorder_interval_days"), 1, 3650),
    default_lead_time_days: optionalInteger(formData.get("default_lead_time_days"), 1, 3650),
    default_commission_percent: optionalDecimal(formData.get("default_commission_percent"), 0, 100),
    created_by: user.id,
  }).select("id").single();
  ensure(error, productErrorMessage(error?.message));
  if (!product) throw new Error("O produto não foi criado.");
  if (stock !== 0) {
    await supabase.from("seller_inventory_movements").insert({
      org_id: orgId, product_id: product.id, movement_type: "initial",
      quantity_delta: stock, balance_after: stock, reason: "Estoque inicial", created_by: user.id,
    });
  }
  revalidateSeller();
  redirect(`/painel/produtos/${product.id}`);
}

export async function updateSellerProduct(formData: FormData) {
  const { supabase, orgId } = await requireSeller();
  const id = uuid(formData.get("product_id"), "Produto");
  const { error } = await supabase.from("seller_products").update({
    collection_id: optionalUuid(formData.get("collection_id")),
    name: required(formData.get("name"), "Nome do produto", 160),
    sku: optional(formData.get("sku"), 80),
    category: optional(formData.get("category"), 80),
    brand: optional(formData.get("brand"), 120),
    kind: productKind(formData.get("kind")),
    status: productStatus(formData.get("status")),
    description: optional(formData.get("description"), 3000),
    base_price_cents: moneyToCents(formData.get("base_price")),
    cost_cents: optionalMoneyToCents(formData.get("cost")),
    track_stock: formData.get("track_stock") === "on",
    low_stock_threshold: optionalInteger(formData.get("low_stock_threshold"), 0, 1_000_000),
    warranty_days: integer(formData.get("warranty_days"), 0, 3650, 0),
    requires_serial: formData.get("requires_serial") === "on",
    reorder_interval_days: optionalInteger(formData.get("reorder_interval_days"), 1, 3650),
    default_lead_time_days: optionalInteger(formData.get("default_lead_time_days"), 1, 3650),
    default_commission_percent: optionalDecimal(formData.get("default_commission_percent"), 0, 100),
  }).eq("id", id).eq("org_id", orgId);
  ensure(error, productErrorMessage(error?.message));
  revalidateSeller();
  redirect(`/painel/produtos/${id}?salvo=1`);
}

export async function createSellerVariant(formData: FormData) {
  const { supabase, user, orgId } = await requireSeller();
  const productId = uuid(formData.get("product_id"), "Produto");
  const stock = integer(formData.get("stock_quantity"), -1_000_000, 1_000_000, 0);
  const { data: variant, error } = await supabase.from("seller_product_variants").insert({
    org_id: orgId,
    product_id: productId,
    name: required(formData.get("name"), "Nome da variação", 120),
    sku: optional(formData.get("sku"), 80),
    attributes: parseAttributes(formData.get("attributes")),
    price_cents: optionalMoneyToCents(formData.get("price")),
    stock_quantity: stock,
  }).select("id").single();
  ensure(error, productErrorMessage(error?.message));
  if (variant && stock !== 0) {
    await supabase.from("seller_inventory_movements").insert({
      org_id: orgId, product_id: productId, variant_id: variant.id, movement_type: "initial",
      quantity_delta: stock, balance_after: stock, reason: "Estoque inicial da variação", created_by: user.id,
    });
  }
  revalidateSeller();
  redirect(`/painel/produtos/${productId}?variacao=criada`);
}

export async function adjustSellerStock(formData: FormData) {
  const { supabase } = await requireSeller();
  const productId = uuid(formData.get("product_id"), "Produto");
  const variantId = optionalUuid(formData.get("variant_id"));
  const delta = integer(formData.get("quantity_delta"), -1_000_000, 1_000_000, 0);
  if (delta === 0) throw new Error("Ajuste a quantidade para um valor diferente de zero.");
  const reason = required(formData.get("reason"), "Motivo do ajuste", 240);
  const { error } = await supabase.rpc("adjust_seller_stock", {
    p_product_id: productId,
    p_variant_id: variantId,
    p_quantity_delta: delta,
    p_reason: reason,
  });
  ensure(error, "Não foi possível ajustar o estoque.");
  revalidateSeller();
  redirect(`/painel/produtos/${productId}?estoque=ajustado`);
}

export async function uploadSellerProductPhoto(formData: FormData) {
  const { supabase, user, orgId } = await requireSeller();
  const productId = uuid(formData.get("product_id"), "Produto");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Escolha uma foto.");
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) throw new Error("A foto pode ter no máximo 6 MB.");
  const extension = PRODUCT_IMAGE_EXTENSIONS[file.type];
  if (!extension) throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  const { data: product } = await supabase.from("seller_products").select("id").eq("id", productId).eq("org_id", orgId).maybeSingle();
  if (!product) throw new Error("Produto não encontrado.");
  const { data: last } = await supabase.from("seller_product_media").select("position").eq("product_id", productId).order("position", { ascending: false }).limit(1).maybeSingle();
  const path = `${orgId}/${productId}/${randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from(PRODUCT_IMAGE_BUCKET)
    .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Não foi possível enviar a foto.");
  const { error } = await supabase.from("seller_product_media").insert({
    org_id: orgId, product_id: productId, storage_path: path,
    alt_text: optional(formData.get("alt_text"), 200), position: (last?.position ?? -1) + 1, created_by: user.id,
  });
  if (error) {
    await admin.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
    throw new Error("A foto foi enviada, mas não pôde ser vinculada ao produto.");
  }
  revalidateSeller();
  redirect(`/painel/produtos/${productId}?foto=enviada`);
}

export async function deleteSellerProductPhoto(formData: FormData) {
  const { supabase, orgId } = await requireSeller();
  const mediaId = uuid(formData.get("media_id"), "Foto");
  const productId = uuid(formData.get("product_id"), "Produto");
  const { data: media } = await supabase.from("seller_product_media").select("storage_path").eq("id", mediaId).eq("org_id", orgId).maybeSingle();
  if (!media) throw new Error("Foto não encontrada.");
  const { error } = await supabase.from("seller_product_media").delete().eq("id", mediaId).eq("org_id", orgId);
  ensure(error, "Não foi possível excluir a foto.");
  await createAdminClient().storage.from(PRODUCT_IMAGE_BUCKET).remove([media.storage_path as string]);
  revalidateSeller();
  redirect(`/painel/produtos/${productId}`);
}

export type ConfirmSellerSaleState = { error: string | null; orderId: string | null };

export async function confirmSellerSale(
  _previousState: ConfirmSellerSaleState,
  formData: FormData,
): Promise<ConfirmSellerSaleState> {
  try {
    const { supabase } = await requireSeller();
    const dealId = uuid(formData.get("deal_id"), "Venda");
    const rawItems = String(formData.get("items_json") ?? "");
    let items: unknown;
    try { items = JSON.parse(rawItems); } catch { throw new Error("Os itens da venda não puderam ser lidos."); }
    if (!Array.isArray(items) || items.length === 0) throw new Error("Adicione pelo menos um item à venda.");
    const { data, error } = await supabase.rpc("confirm_seller_sale", {
      p_deal_id: dealId,
      p_items: items,
      p_payment_method: optional(formData.get("payment_method"), 40),
      p_delivery_method: optional(formData.get("delivery_method"), 40),
      p_discount_cents: moneyToCents(formData.get("discount")),
      p_shipping_cents: moneyToCents(formData.get("shipping")),
      p_notes: optional(formData.get("notes"), 2000),
    });
    ensure(error, friendlyRpcError(error?.message));
    const orderId = String(data ?? "");
    if (!isUuid(orderId)) throw new Error("A venda foi processada, mas o pedido não pôde ser aberto.");
    revalidateSeller();
    return { error: null, orderId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível confirmar a venda.", orderId: null };
  }
}

export async function updateSellerOrder(formData: FormData) {
  const { supabase, orgId } = await requireSeller();
  const orderId = uuid(formData.get("order_id"), "Pedido");
  const status = orderStatus(formData.get("status"));
  const paymentStatus = orderPaymentStatus(formData.get("payment_status"));
  const { error } = await supabase.from("seller_orders").update({
    status,
    payment_status: paymentStatus,
    delivered_at: status === "delivered" || status === "completed" ? new Date().toISOString() : null,
    notes: optional(formData.get("notes"), 2000),
  }).eq("id", orderId).eq("org_id", orgId);
  ensure(error, "Não foi possível atualizar o pedido.");
  revalidateSeller();
  redirect(`/painel/pedidos/${orderId}?salvo=1`);
}

export async function createSellerWarrantyClaim(formData: FormData) {
  const { supabase, user, orgId } = await requireSeller();
  const warrantyId = uuid(formData.get("warranty_id"), "Garantia");
  const { data: warranty } = await supabase.from("seller_warranties").select("id").eq("id", warrantyId).eq("org_id", orgId).maybeSingle();
  if (!warranty) throw new Error("Garantia não encontrada.");
  const { error } = await supabase.from("seller_warranty_claims").insert({
    org_id: orgId, warranty_id: warrantyId,
    title: required(formData.get("title"), "Assunto", 160),
    issue_description: required(formData.get("issue_description"), "Descrição do problema", 4000),
    created_by: user.id,
  });
  ensure(error, "Não foi possível abrir o atendimento.");
  revalidateSeller();
  redirect("/painel/pos-venda?chamado=aberto");
}

export async function updateSellerWarrantyClaim(formData: FormData) {
  const { supabase, orgId } = await requireSeller();
  const claimId = uuid(formData.get("claim_id"), "Atendimento");
  const status = claimStatus(formData.get("status"));
  const { error } = await supabase.from("seller_warranty_claims").update({
    status,
    resolution: optional(formData.get("resolution"), 3000),
    resolved_at: status === "resolved" || status === "cancelled" ? new Date().toISOString() : null,
  }).eq("id", claimId).eq("org_id", orgId);
  ensure(error, "Não foi possível atualizar o atendimento.");
  revalidateSeller();
  redirect("/painel/pos-venda?chamado=atualizado");
}

export async function updateSellerCustomerProfile(formData: FormData) {
  const { supabase, orgId } = await requireSeller();
  const contactId = uuid(formData.get("contact_id"), "Cliente");
  const colors = unique(String(formData.get("preferred_colors") ?? "").split(",").map((item) => item.trim()).filter(Boolean)).slice(0, 20);
  const { error } = await supabase.from("seller_customer_profiles").upsert({
    org_id: orgId,
    contact_id: contactId,
    clothing_sizes: parseKeyValue(formData.get("clothing_sizes")),
    measurements: parseKeyValue(formData.get("measurements")),
    preferred_colors: colors,
    style_notes: optional(formData.get("style_notes"), 2000),
    shoe_size: optionalDecimal(formData.get("shoe_size"), 20, 60),
    reorder_interval_days: optionalInteger(formData.get("reorder_interval_days"), 1, 3650),
  }, { onConflict: "org_id,contact_id" });
  ensure(error, "Não foi possível salvar as preferências do cliente.");
  revalidatePath(`/painel/contatos/${contactId}`);
  redirect(`/painel/contatos/${contactId}?preferencias=salvas`);
}

function revalidateSeller() {
  ["/painel", "/painel/funil", "/painel/produtos", "/painel/colecoes", "/painel/pedidos", "/painel/pos-venda", "/painel/operacao/configuracoes"]
    .forEach((path) => revalidatePath(path));
}

function required(value: FormDataEntryValue | null, label: string, max: number) {
  const result = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!result) throw new Error(`${label} é obrigatório.`);
  return result.slice(0, max);
}
function optional(value: FormDataEntryValue | null, max: number) {
  const result = String(value ?? "").trim();
  return result ? result.slice(0, max) : null;
}
function uuid(value: FormDataEntryValue | null, label: string) {
  const result = String(value ?? "");
  if (!isUuid(result)) throw new Error(`${label} inválido.`);
  return result;
}
function optionalUuid(value: FormDataEntryValue | null) {
  const result = String(value ?? "");
  return isUuid(result) ? result : null;
}
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function integer(value: FormDataEntryValue | null | undefined, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}
function optionalInteger(value: FormDataEntryValue | null, min: number, max: number) {
  const text = String(value ?? "").trim();
  return text ? integer(text, min, max, min) : null;
}
function optionalDecimal(value: FormDataEntryValue | null, min: number, max: number) {
  const text = String(value ?? "").trim().replace(",", ".");
  const parsed = Number(text);
  return text && Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : null;
}
function moneyToCents(value: FormDataEntryValue | null | undefined) {
  const raw = String(value ?? "").trim().replace(/R\$\s?/gi, "").replace(/\s/g, "");
  if (!raw) return 0;
  const decimal = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(decimal);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Informe um valor válido.");
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(parsed * 100));
}
function optionalMoneyToCents(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() ? moneyToCents(value) : null;
}
function dateOrNull(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}
function unique<T>(items: T[]) { return [...new Set(items)]; }
function ensure(error: { message?: string } | null | undefined, message: string) { if (error) throw new Error(message); }
function collectionStatus(value: FormDataEntryValue | null) {
  const result = String(value ?? "draft");
  return (["draft", "active", "archived"].includes(result) ? result : "draft") as "draft" | "active" | "archived";
}
function productStatus(value: FormDataEntryValue | null) {
  const result = String(value ?? "active");
  return (["draft", "active", "inactive"].includes(result) ? result : "active") as "draft" | "active" | "inactive";
}
function productKind(value: FormDataEntryValue | null) {
  const result = String(value ?? "general");
  return (SELLER_SALES_MODELS.some((item) => item.value === result) ? result : "general") as SellerSalesModel;
}
function orderStatus(value: FormDataEntryValue | null) {
  const result = String(value ?? "confirmed");
  const valid = ["draft", "confirmed", "preparing", "ready", "delivered", "completed", "cancelled"] as const;
  return (valid.includes(result as typeof valid[number]) ? result : "confirmed") as typeof valid[number];
}
function orderPaymentStatus(value: FormDataEntryValue | null) {
  const result = String(value ?? "pending");
  const valid = ["pending", "partial", "paid", "refunded"] as const;
  return (valid.includes(result as typeof valid[number]) ? result : "pending") as typeof valid[number];
}
function claimStatus(value: FormDataEntryValue | null) {
  const result = String(value ?? "open");
  const valid = ["open", "analysis", "assistance", "replacement_approved", "refund_approved", "resolved", "cancelled"] as const;
  return (valid.includes(result as typeof valid[number]) ? result : "open") as typeof valid[number];
}
function parseAttributes(value: FormDataEntryValue | null) { return parseKeyValue(value); }
function parseKeyValue(value: FormDataEntryValue | null) {
  return String(value ?? "").split(/[,;\n]/).reduce<Record<string, string>>((result, item) => {
    const [key, ...rest] = item.split(":");
    const normalizedKey = key?.trim().slice(0, 60);
    const normalizedValue = rest.join(":").trim().slice(0, 120);
    if (normalizedKey && normalizedValue) result[normalizedKey] = normalizedValue;
    return result;
  }, {});
}
function productErrorMessage(message?: string) {
  return message?.includes("seller_products_org_sku_unique") || message?.includes("seller_variants_org_sku_unique")
    ? "Este SKU já está sendo usado por outro produto ou variação."
    : "Não foi possível salvar o produto.";
}
function friendlyRpcError(message?: string) {
  if (!message) return "Não foi possível confirmar a venda.";
  const known = ["Estoque insuficiente", "Produto não encontrado", "Variação não encontrada", "Coleção inválida", "Adicione entre", "Informe o produto"];
  return known.find((prefix) => message.includes(prefix)) ? message : "Não foi possível confirmar a venda. Revise os itens e tente novamente.";
}
function safeReturn(value: FormDataEntryValue | null, fallback: string) {
  const result = String(value ?? "");
  return result.startsWith("/painel") && !result.startsWith("//") ? result : fallback;
}
