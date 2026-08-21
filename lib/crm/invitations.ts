import { createHash, randomBytes } from "node:crypto";
import { canonicalizeDashboardPath } from "@/lib/workspace/app-routes";

const INVITATION_BYTES = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;

export function createInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(INVITATION_BYTES).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string): string {
  if (!TOKEN_RE.test(token)) throw new Error("Convite inválido.");
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function safeInternalPath(value: unknown, fallback = "/painel"): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 1000) return fallback;
  return canonicalizeDashboardPath(path);
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "e-mail do convite";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}
