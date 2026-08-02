import type { JobRole, RealEstatePropertyStatus, RealEstatePropertyType, RealEstateTransactionType } from "@/lib/supabase/types";

export const REAL_ESTATE_JOB_ROLES: { value: JobRole; label: string; description: string }[] = [
  { value: "owner", label: "Sócio(a) administrador(a)", description: "Acesso total, equipe e configurações." },
  { value: "broker", label: "Corretor(a) responsável", description: "Gerencia a carteira de imóveis e as vitrines." },
  { value: "agent", label: "Corretor(a) associado(a)", description: "Cadastra e atende imóveis atribuídos a ele(a)." },
  { value: "assistant", label: "Assistente / marketing", description: "Apoia o cadastro de imóveis, sem excluir registros." },
  { value: "staff", label: "Colaborador(a)", description: "Acesso básico ao CRM." },
];

export const REAL_ESTATE_PROPERTY_TYPES: { value: RealEstatePropertyType; label: string }[] = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "cobertura", label: "Cobertura" },
  { value: "terreno", label: "Terreno" },
  { value: "comercial", label: "Comercial" },
  { value: "sala", label: "Sala" },
  { value: "galpao", label: "Galpão" },
  { value: "rural", label: "Rural" },
  { value: "outro", label: "Outro" },
];

export const REAL_ESTATE_TRANSACTION_TYPES: { value: RealEstateTransactionType; label: string }[] = [
  { value: "venda", label: "Venda" },
  { value: "aluguel", label: "Aluguel" },
  { value: "venda_aluguel", label: "Venda ou aluguel" },
];

export const REAL_ESTATE_PROPERTY_STATUSES: { value: RealEstatePropertyStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "ativo", label: "Ativo" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "alugado", label: "Alugado" },
  { value: "inativo", label: "Inativo" },
];

export function jobRoleLabelRealEstate(role: JobRole | null | undefined) {
  return REAL_ESTATE_JOB_ROLES.find((item) => item.value === role)?.label ?? "Colaborador(a)";
}

// Mantenha esta lista idêntica a can_view_realestate() em
// 0051_real_estate_job_roles.sql — não existe fonte única de verdade hoje,
// mesmo padrão do par law-office.ts/0035_law_office_suite.sql.
export function canViewRealEstate(role: JobRole | null | undefined, isAdmin = false) {
  return isAdmin || ["owner", "broker", "agent", "assistant"].includes(role ?? "");
}

// Mantenha idêntica a can_manage_realestate() em 0051_real_estate_job_roles.sql.
export function canManageRealEstate(role: JobRole | null | undefined, isAdmin = false) {
  return isAdmin || ["owner", "broker", "agent"].includes(role ?? "");
}

// O rollout do produto imobiliário foi concluído. A coluna antiga continua no
// schema por compatibilidade, mas uma organização válida de corretor já usa a
// experiência completa sem depender de ativação manual.
export function isRealEstateV2Enabled(org: { real_estate_v2_enabled?: boolean | null } | null | undefined) {
  return Boolean(org);
}

export function propertyTypeLabel(type: RealEstatePropertyType) {
  return REAL_ESTATE_PROPERTY_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function transactionTypeLabel(type: RealEstateTransactionType) {
  return REAL_ESTATE_TRANSACTION_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function propertyStatusLabel(status: RealEstatePropertyStatus) {
  return REAL_ESTATE_PROPERTY_STATUSES.find((item) => item.value === status)?.label ?? status;
}

// "tag-brand"/"tag-honey"/"tag-danger"/"tag-muted" nunca existiram no CSS —
// toda etiqueta de status renderizava com a mesma cor neutra da classe base
// `.tag`. Trocado por classes reais (o mesmo par bg-x-50/text-x-700 usado em
// funil/Board.tsx e painel/metricas), e "vendido"/"alugado" passaram de
// "brand" (mesma cor de "ativo", um anúncio ao vivo) para "success" — fechado
// é resultado positivo, não o mesmo estado de "está no ar".
const STATUS_TAG_CLASS: Record<RealEstatePropertyStatus, string> = {
  rascunho: "bg-surface-2 text-ink-muted",
  ativo: "bg-brand-50 text-brand-700",
  reservado: "bg-warning-50 text-warning-700",
  vendido: "bg-success-50 text-success-700",
  alugado: "bg-success-50 text-success-700",
  inativo: "bg-surface-2 text-ink-muted",
};

export function propertyStatusTagClass(status: RealEstatePropertyStatus) {
  return STATUS_TAG_CLASS[status] ?? "bg-surface-2 text-ink-muted";
}

export function centsToReais(cents: number | null): string {
  if (cents === null) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
