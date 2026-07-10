import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";
import { DEAL_STAGES, type DealStage } from "@/lib/supabase/types";

export const STAGE_KEYS = DEAL_STAGES.map((s) => s.key);

export function str(v: unknown, field: string, max = 80): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new Error(`Campo obrigatório: ${field}.`);
  return s.length > max ? s.slice(0, max) : s;
}

export function detailsObject(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) {
      result[key.slice(0, 60)] = value.trim().slice(0, 200);
    }
  }
  return result;
}

export function optionalStr(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null;
  const s = typeof v === "string" ? v.trim() : String(v).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

export function emailOrNull(v: unknown): string | null {
  const email = optionalStr(v, 160)?.toLowerCase() ?? null;
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  return email;
}

export async function visibleContactIdOrNull(
  supabase: SupabaseClient,
  orgId: string,
  workspaceKey: string,
  v: unknown
): Promise<string | null> {
  const id = optionalStr(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Contato não encontrado.");
  return id;
}

export async function requireVisibleContactId(
  supabase: SupabaseClient,
  orgId: string,
  workspaceKey: string,
  v: unknown
): Promise<string> {
  const id = await visibleContactIdOrNull(supabase, orgId, workspaceKey, v);
  if (!id) throw new Error("Campo obrigatório: contato_id.");
  return id;
}

export function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function isStage(v: string): v is DealStage {
  return (STAGE_KEYS as string[]).includes(v);
}

export function ensureOk(error: unknown) {
  if (!error) return;
  logError("ai/tools", error);
  throw new Error("Erro ao acessar o banco de dados.");
}
