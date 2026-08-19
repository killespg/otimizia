import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // Testes de integração precisam de Supabase local rodando (npm run
    // test:integration) — não entram no `npm test` padrão, que roda sem
    // Docker (inclusive em CI, que hoje não sobe Supabase local).
    exclude: [
      "node_modules",
      ".next",
      "android",
      "test/integration/**",
      ".claude/**",
      ".superpowers/**",
      "otimizia.worktrees/**",
    ],
  },
});
