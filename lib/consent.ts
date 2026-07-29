// Consentimento de cookies não-essenciais. Módulo puro (sem acesso a document
// nem a banco) para poder ser usado no cliente, no servidor e nos testes.
//
// A preferência mora num cookie de primeira parte; o comprovante mora no banco
// (cookie_consent_logs). O cookie é a fonte de verdade para DECIDIR se carrega
// analytics/pixel; o banco é a fonte de verdade para PROVAR o que a pessoa
// escolheu e quando.

export const CONSENT_COOKIE = "otimizia_consent";

// Bump aqui sempre que mudar o que é coletado ou quem recebe. Cookie com
// versão antiga é tratado como inexistente: o banner volta a aparecer, que é
// exatamente o comportamento exigido quando a finalidade muda.
export const CONSENT_POLICY_VERSION = "1";

// 180 dias. Consentimento não é para sempre — passado esse prazo perguntamos
// de novo em vez de assumir que a escolha de um ano atrás continua valendo.
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const CONSENT_ACTIONS = ["accepted_all", "rejected_all", "custom", "withdrawn"] as const;
export type ConsentAction = (typeof CONSENT_ACTIONS)[number];

export type ConsentCategories = {
  analytics: boolean;
  marketing: boolean;
};

export type ConsentState = ConsentCategories & {
  version: string;
  visitorId: string;
  action: ConsentAction;
};

export const ESSENTIAL_ONLY: ConsentCategories = { analytics: false, marketing: false };
export const ALL_CATEGORIES: ConsentCategories = { analytics: true, marketing: true };

// Formato compacto e sem JSON: cookie curto, fácil de ler num header e imune a
// problema de encoding. Ex.: "1|a3f...c9|1|0|accepted_all"
export function serializeConsent(state: ConsentState): string {
  return [
    state.version,
    state.visitorId,
    state.analytics ? "1" : "0",
    state.marketing ? "1" : "0",
    state.action,
  ].join("|");
}

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  const parts = raw.split("|");
  if (parts.length !== 5) return null;

  const [version, visitorId, analytics, marketing, action] = parts;
  if (version !== CONSENT_POLICY_VERSION) return null;
  if (!isVisitorId(visitorId)) return null;
  if (analytics !== "0" && analytics !== "1") return null;
  if (marketing !== "0" && marketing !== "1") return null;
  if (!isConsentAction(action)) return null;

  return {
    version,
    visitorId,
    analytics: analytics === "1",
    marketing: marketing === "1",
    action,
  };
}

export function isVisitorId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{32}$/.test(value);
}

export function isConsentAction(value: unknown): value is ConsentAction {
  return typeof value === "string" && (CONSENT_ACTIONS as readonly string[]).includes(value);
}

// A ação é derivada das categorias, não informada pelo cliente: assim o log
// nunca diz "aceitou tudo" com marketing desligado.
export function actionFor(categories: ConsentCategories, previous: ConsentState | null): ConsentAction {
  const acceptedSomethingBefore = Boolean(previous && (previous.analytics || previous.marketing));
  if (categories.analytics && categories.marketing) return "accepted_all";
  if (!categories.analytics && !categories.marketing) {
    return acceptedSomethingBefore ? "withdrawn" : "rejected_all";
  }
  return "custom";
}
