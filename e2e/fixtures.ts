// Usuário fixo de e2e, criado (idempotente) pelo global-setup contra o
// Supabase local. Fixo de propósito: cada run reaproveita a mesma conta em
// vez de acumular usuários novos a cada execução.
export const E2E_EMAIL = "e2e-tests@otimizia.local";
export const E2E_PASSWORD = "Playwright-e2e-tests-2026!";
