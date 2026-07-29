import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const CONFIRMATION_PATTERN = /\bEXCLUIR\s+([A-Z0-9]{6})\b/i;

export function createDeletionCode(): string {
  return randomBytes(5).toString("hex").slice(0, 6).toUpperCase();
}

export function hashDeletionCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function extractDeletionCode(message: string): string | null {
  return message.match(CONFIRMATION_PATTERN)?.[1]?.toUpperCase() ?? null;
}

export async function confirmDeletionFromUserMessage(
  supabase: SupabaseClient,
  message: string,
): Promise<boolean> {
  const code = extractDeletionCode(message);
  if (!code) return false;
  const { data, error } = await supabase.rpc("confirm_assistant_deletion", {
    p_code_hash: hashDeletionCode(code),
  });
  if (error) throw error;
  return data === true;
}
