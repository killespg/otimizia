# Testes de integração (RLS / multi-tenancy)

Esses testes rodam contra um Postgres real (Supabase local via Docker), não
contra mocks — é a única forma de verificar que as policies de RLS
(`supabase/migrations/*.sql`) realmente isolam organizações e bloqueiam
colunas sensíveis (`assignee_id`, `reviewer_id` etc).

## Rodando

```bash
npx --no-install supabase start   # sobe Postgres + Auth + API localmente (precisa de Docker)
npm run test:integration
npx --no-install supabase stop    # quando terminar
```

Se não houver Supabase local rodando, `npm run test:integration` falha com uma
mensagem de preparação. Isso impede um resultado verde com todos os casos
ignorados. O `npm test` normal continua independente de Docker porque exclui
`test/integration/**`.
