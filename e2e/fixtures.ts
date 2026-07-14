// Usuário fixo de e2e, criado (idempotente) pelo global-setup contra o
// Supabase local. Fixo de propósito: cada run reaproveita a mesma conta em
// vez de acumular usuários novos a cada execução.
export const E2E_EMAIL = "e2e-tests@otimizia.local";
export const E2E_PASSWORD = "Playwright-e2e-tests-2026!";

// Usuário fixo separado, já cadastrado no workspace imobiliário (profession_type
// definido na criação via user_metadata) — o fluxo de imóveis precisa desse
// workspace específico, então não reaproveita o usuário genérico acima.
export const E2E_REALESTATE_EMAIL = "e2e-realestate-tests@otimizia.local";
export const E2E_REALESTATE_PASSWORD = "Playwright-e2e-realestate-2026!";
