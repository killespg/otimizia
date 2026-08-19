import { defineConfig } from "vitest/config";
import path from "node:path";

// Config separada dos testes de integração (RLS/multi-tenancy contra um
// Postgres local de verdade). Requer `supabase start` rodando antes —
// veja test/integration/README.md.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["test/integration/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
