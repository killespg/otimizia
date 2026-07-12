# Testes e2e (Playwright)

Exercitam o fluxo real no navegador: login → criar contato → criar lembrete →
concluir. Rodam contra Supabase local, não contra produção.

## Rodando

```bash
npx supabase start        # sobe Postgres + Auth local
cp .env.example .env.local
npx supabase status       # copie API URL / anon key / service role key para o .env.local
npm run test:e2e
```

O `global-setup.ts` cria (uma vez, idempotente) o usuário fixo de teste
(`e2e/fixtures.ts`) usado pela suíte. O `webServer` do `playwright.config.ts`
sobe `npm run dev` automaticamente se ainda não houver nada em
`http://localhost:3000`.
