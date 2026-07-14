# Rede de segurança de deploy

Este documento existe porque hoje **não há staging real**: a branch de
produção (`claude/saas-creation-marketing-a49v4f`) é a mesma branch padrão
do GitHub, e todo push nela vai direto pro Vercel em produção
(`useotimizia.com`). Já tivemos um incidente causado por isso (cron horário
no plano Hobby travando todo deploy silenciosamente por várias horas). Este
runbook é o mínimo pra reduzir o risco de repetir esse tipo de problema sem
precisar de infraestrutura nova.

## O que já existe e não precisa de setup (confirmado, não suposição)

**Preview deployments automáticos da Vercel já funcionam por padrão.**
Confirmado em duas frentes:
- `vercel.json` e `package.json` não têm `ignoreCommand`/build step
  customizado que pudesse bloquear isso.
- Evidência direta: `vercel inspect` numa URL de deployment já existente
  mostrou `Cloning ... (Branch: claude/professions-interface-bugs-hkq5zb)`
  com status `Ready`/`Preview` — ou seja, qualquer branch que não seja a de
  produção já ganha uma URL de preview isolada automaticamente a cada push,
  sem nenhuma configuração adicional.

**O que isso significa na prática**: se você (ou eu) criar uma branch nova
pra uma mudança arriscada e der push nela (sem PR, ou com PR aberto contra
a branch de produção), a Vercel gera uma URL tipo
`https://otimizia-<hash>-killesvenancio-2557s-projects.vercel.app` com o
banco real (mesmo Supabase de produção — ver seção seguinte) mas sem afetar
`useotimizia.com`. Isso já dá uma forma de olhar o build/UI antes de
promover pra produção, mesmo sem um banco de staging separado.

## O que NÃO é viável hoje: banco Supabase de staging

Investigado e descartado, não por falta de tentativa: criar um projeto
Supabase novo do zero exige um **token de acesso de conta/organização**
(`SUPABASE_ACCESS_TOKEN`, via `supabase login` interativo ou um Personal
Access Token gerado no dashboard da conta). O que este projeto tem
localmente (`.env.local`) são só as chaves de um projeto específico já
criado (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) — elas
autenticam contra ESSE projeto, não contra a conta Supabase como um todo, e
não têm permissão pra criar outro projeto. Confirmado rodando
`supabase projects list`, que retornou `LegacyPlatformAuthRequiredError:
Access token not provided`.

**Se você quiser um staging de verdade**, o caminho é manual, e a decisão é
sua porque tem custo:
1. Criar um segundo projeto no dashboard do Supabase (plano free cobre isso,
   mas ele pausa depois de dias sem uso — não é "sempre ligado" de graça).
2. Rodar todas as 64 migrations de `supabase/migrations/` nesse projeto novo
   (na ordem, do zero).
3. Criar um segundo projeto na Vercel (ou um Environment separado) apontando
   pra esse banco, com as próprias env vars.
4. Popular com `supabase/seed.sql` em vez de dados reais.

Sem isso, qualquer teste "real" de migration ou fluxo de dados roda contra
o banco de produção mesmo — a prática recomendada abaixo existe justamente
pra compensar essa lacuna.

## Checklist antes de qualquer push que vá pra produção

Rodar sempre, nessa ordem, antes de dar push na branch de produção:

1. **`npm run typecheck`** — sem erro.
2. **`npm run lint`** — sem erro novo (warnings pré-existentes de `<img>`
   em `imoveis/[id]` e `share/imoveis/[token]` são conhecidos, não bloqueiam).
3. **`npm run test`** — sem regressão nova. (Hoje há uma falha pré-existente
   em `lib/deals-report.test.ts` não relacionada a datas relativas — não
   é uma regressão nova, mas vale revisar se realmente ainda é esperada.)
4. **Se a mudança incluir migration nova em `supabase/migrations/`**:
   revisar o diff procurando especificamente por:
   - `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` — sempre destrutivo, sempre
     para e confirma com o usuário antes de aplicar contra o banco real.
   - Mudança de tipo de coluna que estreita dado existente (ex.: `text` →
     `varchar(20)`, `numeric` → `integer`) — pode truncar/rejeitar dado já
     gravado.
   - Remoção de `DEFAULT` ou adição de `NOT NULL` numa coluna existente sem
     backfill antes — quebra insert de linha existente ou de código que
     ainda não manda aquele campo.
   - Toda tabela nova precisa de `ENABLE ROW LEVEL SECURITY` +policies
     usando `can_view_realestate`/`can_manage_realestate` (ou o par
     equivalente da área), igual ao padrão das migrations 0056-0064.
5. **Se a mudança mexer em `vercel.json` (crons)**: lembrar que o plano
   Hobby da Vercel só aceita cron **no máximo 1x por dia** — um cron mais
   frequente que isso derruba o deploy inteiro (não só a rota do cron),
   silenciosamente, sem aparecer no GitHub. Isso já aconteceu uma vez
   (ver commit `a3fdd00`).
6. **Se a mudança adicionar uma rota nova que chama a API da Anthropic**:
   confirmar que ela tem rate limiting (ver `lib/ai/rate-limit.ts`) e que
   `ANTHROPIC_API_KEY` já está configurada no ambiente certo da Vercel
   (hoje só existe em Production — testar localmente exige pedir a chave
   ao usuário ou aceitar não testar a chamada real, só o resto do pipeline).
7. Depois do push: conferir com `vercel ls otimizia` e `vercel inspect
   <url> --logs` que o deploy saiu `Ready` e foi construído a partir do
   commit esperado — não assumir que "dar push" implica "deploy no ar"
   (é exatamente o que já falhou antes).

## Rollback rápido se algo quebrar em produção

Não precisa reverter commit primeiro pra recuperar o ar:

```
vercel ls otimizia                       # achar o deployment Ready anterior
vercel rollback <url-do-deployment-bom>  # reaponta o alias de produção pra ele na hora
```

Depois, com calma, reverter o commit problemático no Git (`git revert`) pra
o próximo push automático não reintroduzir o mesmo bug.
