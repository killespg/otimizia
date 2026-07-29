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
2. Rodar todas as migrations de `supabase/migrations/` nesse projeto novo
   (na ordem, do zero). Hoje são 72 — não fixe o número aqui, ele envelhece.
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
3. **`npm run test`** — sem regressão nova. Em 28/07/2026 a suíte estava
   inteira verde (246 testes). A falha pré-existente em
   `lib/deals-report.test.ts` que este documento citava não existe mais.
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
7. **Depois do push**: confirmar que o deploy saiu `Ready` **e** que foi
   construído a partir do commit esperado. Não assumir que "dar push" implica
   "deploy no ar" — é exatamente o que já falhou antes. São duas checagens
   diferentes e nenhuma substitui a outra:

   **a) Qual commit está no ar** — só dá para ver no painel da Vercel:

   <https://vercel.com/killesvenancio-2557s-projects/otimizia/deployments>

   O deployment do topo com `Production` precisa estar `Ready` e mostrar o
   sha do commit que você acabou de empurrar. Se estiver `Error`, abrir o
   deployment e ler o build log ali mesmo.

   Não existe atalho por `curl` para esta parte: nenhum header da resposta
   identifica o build. Verificado em 29/07/2026 — `x-vercel-id` é id de
   requisição, `x-vercel-cache` é estado de cache e `x-matched-path` é a rota.
   Nenhum carrega o sha. Se algum dia quiser essa checagem por linha de
   comando, o caminho é a aplicação publicar `VERCEL_GIT_COMMIT_SHA` (a Vercel
   injeta essa variável no build) em `/api/health`; hoje ela não publica.

   **b) Se o site responde** — isso sim roda em qualquer máquina, e é o que
   pega o modo de falha que originou este documento (deploy some, site cai):

   ```bash
   curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://useotimizia.com/ && curl -s https://useotimizia.com/api/health && curl -s -o /dev/null -w "\nlogin %{http_code}\n" https://useotimizia.com/login
   ```

   Esperado: `200` na landing, `{"service":"otimizia","status":"ok",...}` no
   health e `200` no login.

   **Sobre a CLI da Vercel**: as versões anteriores deste runbook mandavam
   rodar `vercel ls` e `vercel inspect`, mas a CLI **não está instalada** na
   máquina de desenvolvimento — quem seguia o passo ao pé da letra travava com
   `command not found`. Ela continua sendo uma alternativa válida ao item (a),
   e não uma dependência: instalar exige `npm i -g vercel` e um `vercel login`
   interativo. Enquanto isso não for feito, use o painel.

## Rollback rápido se algo quebrar em produção

Não precisa reverter commit primeiro pra recuperar o ar.

**Pelo painel** (funciona sem instalar nada, é o caminho a usar sob pressão):
abrir a lista de deployments, achar o último `Ready` bom, e usar
`Instant Rollback` no menu de três pontos dele. O alias de produção reaponta
na hora.

<https://vercel.com/killesvenancio-2557s-projects/otimizia/deployments>

Nem todo deployment serve de alvo: a API marca os elegíveis com
`isRollbackCandidate`. Na prática são os que já foram produção.

**Pela CLI**, se ela estiver instalada e autenticada (ver a ressalva no item 7
do checklist — hoje não está):

```bash
vercel ls otimizia
```

```bash
vercel rollback <url-do-deployment-bom>
```

Depois, com calma, reverter o commit problemático no Git (`git revert`) pra
o próximo push automático não reintroduzir o mesmo bug.
