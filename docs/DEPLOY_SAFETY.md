# Rede de segurança de deploy

O projeto não permite mais que um Preview da Vercel use silenciosamente o
Supabase de produção. `next.config.mjs` bloqueia o build quando a fronteira de
ambiente está incoerente:

- Preview exige `SUPABASE_ENVIRONMENT=staging`;
- Production exige `SUPABASE_ENVIRONMENT=production`;
- desenvolvimento e CI usam `SUPABASE_ENVIRONMENT=local`.

Se ainda não existir um projeto Supabase de staging, o comportamento seguro é
o Preview falhar. Nunca libere o Preview apontando para dados reais.

## Ambientes

### CI isolado

O workflow `.github/workflows/ci.yml` sobe Supabase local em Docker, aplica as
migrations e cria uma conta E2E efêmera. Esse banco existe apenas durante o
job e é destruído no final.

### Staging

Crie um projeto Supabase separado e configure as variáveis do ambiente
**Preview** na Vercel:

1. `NEXT_PUBLIC_SUPABASE_URL` do staging;
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` do staging;
3. `SUPABASE_SERVICE_ROLE_KEY` do staging;
4. `SUPABASE_ENVIRONMENT=staging`;
5. demais integrações em modo de teste ou desativadas.

Rode todas as migrations em ordem e use apenas dados sintéticos. Chaves de
Stripe, Evolution, Resend, Autentique e outros serviços de produção não devem
ser copiadas para Preview.

### Produção

O ambiente **Production** da Vercel deve ter
`SUPABASE_ENVIRONMENT=production`. A branch produtiva atual é
`claude/saas-creation-marketing-a49v4f`.

## Gate obrigatório

O CI precisa concluir, sem etapas ignoradas:

1. `npm run lint`;
2. `npm run typecheck`;
3. `npm test`;
4. `npm run test:integration` contra Supabase local;
5. `npm run build`;
6. `npm run test:e2e`, incluindo login e rotas autenticadas.

`npm run test:integration` falha quando o banco local não está ativo. No CI,
ausência de `E2E_EMAIL` ou `E2E_PASSWORD` também falha a configuração do
Playwright.

## Revisão de migrations

Antes de aplicar migrations em staging ou produção:

- pare diante de `DROP TABLE`, `DROP COLUMN` ou `TRUNCATE`;
- não estreite tipos sem inventário e backfill;
- não adicione `NOT NULL` sem preparar linhas existentes;
- toda tabela acessível pela API precisa de RLS, policies e grants explícitos;
- policies devem manter `org_id`, workspace e cargo;
- mudanças em buckets privados precisam de teste de acesso direto ao Storage.

As migrations `0075`, `0076` e `0077` são pré-requisito para esta versão: elas
restringem escrita nas fotos imobiliárias, criam anexos privados do WhatsApp e
substituem grants implícitos de funções RPC por allowlists explícitas. A `0077`
também garante que a exclusão de uma organização remova os vínculos legados do
WhatsApp sem deixar dados órfãos.

## Crons

No plano Hobby, cada cron da Vercel deve executar no máximo uma vez por dia.
Cron inválido pode impedir o deploy inteiro. O endpoint
`/api/cron/assistant-attachments` também:

- remove anexos expirados do Tim;
- remove anexos privados expirados do WhatsApp;
- migra ou elimina imagens antigas do WhatsApp no bucket público.

Depois de aplicar `0076`, execute esse cron uma vez e confira
`legacyFailures=0`.

## Verificação pós-deploy

O health publica o ambiente e o SHA injetado pela Vercel:

```bash
curl -s https://useotimizia.com/api/health
```

O campo `commit` deve ser exatamente o SHA promovido. Além disso:

```bash
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://useotimizia.com/
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://useotimizia.com/login
```

Landing, login e health precisam responder 200. Confira também no painel da
Vercel se o deployment está `Ready`.

## Rollback

No painel da Vercel, abra o último deployment produtivo conhecido como bom e
use **Instant Rollback**. Depois faça `git revert` do commit defeituoso para o
próximo push não reintroduzir a falha.

Não use rollback de banco como primeira reação. Se uma migration já foi
aplicada, prefira uma migration corretiva compatível com os dados existentes.
