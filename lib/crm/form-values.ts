/**
 * Leitura e normalização dos valores que chegam dos formulários do painel.
 *
 * Vive fora de `app/(dashboard)/painel/actions.ts` porque aquele arquivo é
 * `"use server"`: lá todo export vira uma server action, então helper puro não
 * pode ser exportado nem testado direto. Aqui é módulo comum — o mesmo código,
 * agora coberto por teste.
 *
 * Regra da casa: quem recebe `FormDataEntryValue | null` trata entrada de
 * usuário. Ou devolve um valor já limitado e normalizado, ou lança com uma
 * mensagem em português que a tela mostra sem tradução.
 */
import { logError } from "@/lib/utils/logger";
import { parseBrlAmount } from "@/lib/utils/form-parse";
import { type FieldSpec, type ProfessionType } from "@/lib/people/professions";
import { DEAL_STAGES, type DealStage } from "@/lib/supabase/types";
import { normalizeWorkspaceKeys } from "@/lib/workspace/workspaces";

export const LIMIT = {
  name: 120,
  phone: 40,
  email: 160,
  instagram: 60,
  company: 120,
  source: 120,
  notes: 1200,
  title: 160,
  interaction: 1200,
};

export function text(v: FormDataEntryValue | null, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

export function requiredText(
  v: FormDataEntryValue | null,
  label: string,
  max: number
): string {
  const s = text(v, max);
  if (!s) throw new Error(`${label} obrigatório.`);
  return s;
}

export function emptyToNull(v: FormDataEntryValue | null, max: number): string | null {
  const s = text(v, max);
  return s === "" ? null : s;
}

export function emailOrNull(v: FormDataEntryValue | null): string | null {
  const email = emptyToNull(v, LIMIT.email)?.toLowerCase() ?? null;
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail inválido.");
  }
  return email;
}

export function normalizeLabels(v: FormDataEntryValue | null): string {
  const raw = text(v, 240);
  if (!raw) return "";
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((label) => label.trim().slice(0, 32))
        .filter(Boolean)
    )
  ).join(", ");
}

export function urlOrNull(v: FormDataEntryValue | null): string | null {
  const raw = emptyToNull(v, 300);
  if (!raw) return null;
  let url = raw;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("URL inválida.");
    }
    return parsed.toString().slice(0, 300);
  } catch {
    throw new Error("URL inválida.");
  }
}

export function imageExtension(contentType: string, fileName: string): string {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  if (byType[contentType]) return byType[contentType];
  const match = fileName.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match?.[1] ?? "jpg";
}

export function dealPhotos(details: Record<string, string> | null | undefined): string[] {
  return parseStringArray(details?.photo_urls);
}

export function dealPhotoPaths(details: Record<string, string> | null | undefined): string[] {
  return parseStringArray(details?.photo_paths);
}

export function parseStringArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeInstagram(v: FormDataEntryValue | null): string | null {
  let handle = text(v, 200);
  if (!handle) return null;
  // O esquema é opcional: quem copia o perfil do celular costuma colar
  // "instagram.com/maria", sem http. A barra final também, para que colar só
  // o domínio resulte em null em vez de virar um "usuário" chamado
  // instagram.com.
  handle = handle.replace(/^(https?:\/\/)?(www\.|m\.)?instagram\.com\/?/i, "");
  handle = handle.replace(/^@/, "");
  handle = handle.split(/[/?]/)[0].trim();
  return handle ? handle.slice(0, LIMIT.instagram) : null;
}

export function moneyToCents(v: FormDataEntryValue | null): number | null {
  const raw = text(v, 32).replace(/[R$\s]/g, "");
  if (!raw) return null;

  const value = parseBrlAmount(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.round(value * 100), 999_999_999_99);
}

export function percentOrNull(v: FormDataEntryValue | null): number | null {
  const raw = text(v, 32).replace("%", "").replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.round(value * 100) / 100, 100);
}

export function dateTimeOrNull(v: FormDataEntryValue | null): string | null {
  const raw = text(v, 64);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function recurrenceOrNone(
  v: FormDataEntryValue | null
): "none" | "daily" | "weekly" | "monthly" {
  return v === "daily" || v === "weekly" || v === "monthly" ? v : "none";
}

export function advanceRecurrence(
  dueAt: string | null,
  recurrence: "daily" | "weekly" | "monthly"
): string | null {
  const base = dueAt ? new Date(dueAt) : new Date();
  if (recurrence === "daily") base.setDate(base.getDate() + 1);
  else if (recurrence === "weekly") base.setDate(base.getDate() + 7);
  else base.setMonth(base.getMonth() + 1);
  return base.toISOString();
}

export function isDealStage(stage: string): stage is DealStage {
  return DEAL_STAGES.some((item) => item.key === stage);
}

export function stageFromPipelineList(listName: string): DealStage {
  const normalized = listName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (normalized.includes("perdido") || normalized.includes("perda") || normalized.includes("lost")) {
    return "perdido";
  }
  if (
    normalized.includes("fechado") ||
    normalized.includes("vendido") ||
    normalized.includes("vendas") ||
    normalized.includes("ganho") ||
    normalized.includes("won")
  ) {
    return "ganho";
  }
  if (
    normalized.includes("proposta") ||
    normalized.includes("negociacao") ||
    normalized.includes("visita")
  ) {
    return "negociacao";
  }
  if (normalized.includes("analise") || normalized.includes("contato") || normalized.includes("follow")) {
    return "em_contato";
  }
  return "novo";
}

export function selectedProfessionTypes(formData: FormData): ProfessionType[] {
  return normalizeWorkspaceKeys(formData.getAll("profession_types"));
}

export function collectDetails(formData: FormData, fields: FieldSpec[]): Record<string, string> {
  const details: Record<string, string> = {};
  for (const field of fields) {
    const raw = text(formData.get(`details.${field.key}`), 200);
    if (!raw) continue;
    if (field.type === "select" && field.options && !field.options.includes(raw)) continue;
    details[field.key] = raw;
  }
  return details;
}

export function ensureOk(error: unknown, fallback: string) {
  if (!error) return;
  logError("app.action", error);
  throw new Error(fallback);
}

/**
 * Só aceita caminho interno. O `return_to` chega de um input escondido em
 * formulário, então um valor hostil viraria redirect aberto para fora do
 * produto.
 */
export function safeReturnPath(v: FormDataEntryValue | null, fallback: string): string {
  const path = typeof v === "string" ? v.trim() : "";
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  return path.slice(0, 160);
}
