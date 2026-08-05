import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` só existe para o build do Next quebrar se um módulo de
      // servidor entrar no bundle do cliente. Nos testes, que rodam em node,
      // não há bundle de cliente e o pacote não resolve — então vira no-op.
      // Sem isso, qualquer teste que renderize uma tela que alcance uma server
      // action falha na importação, não na asserção.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // Testes de integração precisam de Supabase local rodando (npm run
    // test:integration) — não entram no `npm test` padrão, que roda sem
    // Docker (inclusive em CI, que hoje não sobe Supabase local).
    exclude: ["node_modules", ".next", "android", "test/integration/**"],
  },
});
