import { randomBytes, createHash } from "node:crypto";

// 2.4 (Fase 2): chaves de API pública. A chave crua só existe uma vez, no
// momento da criação — só o hash (sha256) fica no banco (api_keys.key_hash),
// mesmo princípio de nunca guardar segredo em texto puro.
const KEY_PREFIX_LENGTH = 8;

export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const rawKey = `otz_${randomBytes(24).toString("hex")}`;
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, KEY_PREFIX_LENGTH),
  };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes(required);
}
