# Testes de integração (RLS / multi-tenancy)

Esses testes rodam contra um Postgres real (Supabase local via Docker), não
contra mocks — é a única forma de verificar que as policies de RLS
(`supabase/migrations/*.sql`) realmente isolam organizações e bloqueiam
colunas sensíveis (`assignee_id`, `reviewer_id` etc).

## Rodando

```bash
npx supabase start   # sobe Postgres + Auth + API localmente (precisa de Docker)
npm run test:integration
npx supabase stop    # quando terminar
```

Se não houver Supabase local rodando, a suíte inteira é pulada (não falha) —
`npm test` normal não depende disso.
