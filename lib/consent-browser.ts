"use client";

import {
  CONSENT_COOKIE,
  parseConsent,
  type ConsentCategories,
  type ConsentState,
} from "@/lib/consent";

// Evento interno: quem depende do consentimento (scripts de analytics) escuta
// isso em vez de esperar um reload. Sem ele, aceitar o banner só ligaria a
// medição na página seguinte.
export const CONSENT_CHANGED_EVENT = "otimizia:consent-changed";
// Reabrir o painel a partir do rodapé ou da política de privacidade — a LGPD
// exige que revogar seja tão fácil quanto consentir.
export const CONSENT_OPEN_EVENT = "otimizia:consent-open";

export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  return parseConsent(decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)));
}

export function createVisitorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// O cookie é gravado pelo servidor (Set-Cookie na resposta) junto com o
// comprovante. Se o registro falhar, nada é salvo e a resposta é `false` —
// quem chama mantém o banner aberto.
export async function saveConsent(
  visitorId: string,
  categories: ConsentCategories
): Promise<boolean> {
  try {
    const response = await fetch("/api/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitorId, ...categories }),
    });
    if (!response.ok) return false;
  } catch {
    return false;
  }

  window.dispatchEvent(new CustomEvent<ConsentCategories>(CONSENT_CHANGED_EVENT, { detail: categories }));
  return true;
}

export function openConsentPreferences(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
