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

const STATUS_TAG_CLASS: Record<RealEstatePropertyStatus, string> = {
  rascunho: "tag-muted",
  ativo: "tag-brand",
  reservado: "tag-honey",
  vendido: "tag-brand",
  alugado: "tag-brand",
  inativo: "tag-danger",
};

export function propertyStatusTagClass(status: RealEstatePropertyStatus) {
  return STATUS_TAG_CLASS[status] ?? "tag-muted";
}

export function centsToReais(cents: number | null): string {
  if (cents === null) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
