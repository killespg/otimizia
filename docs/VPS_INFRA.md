---
tags: [otimizia, infra, vps, n8n, evolution, runbook]
atualizado: 2026-07-28
fonte: derivado do código de killespg/otimizia + GitHub API
status: parcial — ver "Lacunas" no fim
---

# VPS — Infraestrutura OtimizIA

> [!warning] A VPS é a parte menos documentada e mais crítica do stack
> Não existe **nenhuma** referência à VPS, ao n8n ou ao pipeline de incidentes
> no repositório do OtimizIA. O único vestígio no código é o placeholder
> `EVOLUTION_API_URL=https://evolution.seu-vps.com` no `.env.example`.
> Toda a operação está na cabeça do dono. Esta nota existe pra mudar isso.

Relacionado: [[OtimizIA]] · [[Evolution API]] · [[n8n]] · [[Supabase]]

---

## O que roda na VPS

### 1. Evolution API (WhatsApp) — serviço de produção

Único componente da VPS que o **produto** depende em tempo real.

- **Cliente no app:** `lib/evolution.ts` (comentário no topo: *"Cliente mínimo
  para a Evolution API (self-hosted)"*, *"Se a instância do VPS estiver numa
  versão com contrato diferente, o ajuste fica isolado aqui"*).
- **Versão do contrato:** Evolution **v2**, integração `WHATSAPP-BAILEYS`.
- **Variáveis no app:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`
  (a apikey global = `AUTHENTICATION_API_KEY` no `.env` do Evolution).
- **Endpoints usados pelo OtimizIA:**

| Método | Caminho | Uso no app |
|---|---|---|
| POST | `/instance/create` | `app/api/whatsapp/connect` — gera QR code (`qrcode.base64`), registra webhook inline |
| GET | `/instance/connectionState/{instance}` | `app/api/whatsapp/status` — estados `open` / `close` / `connecting` |
| POST | `/message/sendText/{instance}` | `app/api/whatsapp/send` e `visit-reminders` |

- **Webhook de volta:** Evolution → `app/api/whatsapp/webhook`.
- **Multi-tenant:** uma instância Evolution **por organização**; o mapeamento
  org → instância vive no Supabase, resolvido em `app/api/whatsapp/send`.

> [!danger] Backup do volume de sessões
> As sessões do Baileys ficam em disco na VPS. **Perder esse volume = todo
> cliente do OtimizIA precisa reescanear o QR code.** É o pior incidente
> possível do produto e não tem recuperação sem backup.

### 2. n8n — automação e pipeline de incidentes

- **Pipeline de incidentes (confirmado funcionando):** detecta erro no site →
  pede aprovação via **Telegram** → aciona Claude Code → abre PR no GitHub.
  Ver [[#Verificação da automação]] abaixo.
- Não há nada no repo descrevendo os fluxos. Exportar os workflows do n8n em
  JSON e versionar (ou pelo menos anexar aqui) é o próximo passo óbvio.

---

## Verificação da automação (2026-07-28)

**Status: funcionando de ponta a ponta.** ✅

Evidência concreta — PR [#4](https://github.com/killespg/otimizia/pull/4) em
`killespg/otimizia`:

- **Título:** `hotfix automatico: hotfix/auto-20260726-203911`
- **Corpo:** *"Aberto pelo pipeline de incidentes apos aprovacao via Telegram."*
- **Aberto:** 2026-07-26 21:24:38Z
- **Merged:** 2026-07-26 21:32:34Z (8 minutos depois)
- **CI:** job `check` verde em 81s (lint + typecheck + test + build) e
  `Vercel Preview Comments` verde — **o merge só aconteceu com CI passando.**

O ciclo detecção → aprovação humana → correção → CI → merge fechou sozinho.
A parte de aprovação via Telegram é o acerto de design aqui: mantém humano no
circuito sem exigir que você abra o computador.

### O que o hotfix mudou

`lib/supabase/middleware.ts` — move o cálculo de `isProtected` / `isAuthPage`
para **antes** da criação do client Supabase, com early-return:

```ts
if (!isProtected && !isAuthPage) {
  return NextResponse.next({ request });
}
```

Antes, **toda** requisição (inclusive landing, `/termos`, `/share/*`) criava
client e chamava `supabase.auth.getUser()`. Correção legítima e boa para
performance/custo.

> [!note] Efeito colateral não revisado
> Páginas públicas agora **não renovam mais o cookie de sessão**. Um usuário
> logado que fique parado numa página pública (landing, `/share/*`) pode ter a
> sessão expirar onde antes ela era renovada de forma transparente. Não é
> bug de segurança — rotas protegidas seguem checando auth — mas é uma mudança
> de comportamento que passou direto, com merge 8 minutos após abrir e sem
> revisão humana do diff. Vale observar se aparecer relato de "fui deslogado
> do nada".

### Ponto de atenção do pipeline

O PR #4 tem base `claude/saas-creation-marketing-a49v4f`, que também é a branch
única do CI (`.github/workflows/ci.yml`). O pipeline está mergeando na branch
de trabalho principal automaticamente. Funciona, mas o portão que segura tudo
hoje é **só o CI verde** — não há revisão humana do diff, apenas aprovação
via Telegram *antes* de o código existir.

---

## Riscos abertos da VPS

1. **Sem heartbeat.** Se o Evolution cair ou um cron não rodar, nada gera erro —
   é uma ausência, não uma exceção. O agente de erros atual não vê. Falha mais
   cara do produto e hoje 100% invisível.
2. **Sem backup documentado** do volume de sessões do Baileys nem do banco do n8n.
3. **Segredos no n8n.** O n8n guarda `CRON_SECRET`, credencial do GitHub e token
   do Telegram. Se ele está exposto na internet sem autenticação forte, é o elo
   mais fraco de todo o stack.
4. **Sem dedupe no agente de erros.** Um erro em rajada pode gerar dezenas de
   sessões/PRs para o mesmo bug.
5. **Ponto único de falha.** Uma VPS, sem redundância, servindo o canal
   principal do produto.

---

## Lacunas — só você pode preencher

Não tenho acesso à VPS a partir do ambiente de desenvolvimento, então o que
segue não é verificável a partir do código:

- [ ] Provedor, região e plano (Hostinger? Contabo? DigitalOcean? vCPU/RAM/disco)
- [ ] IP / hostname real e domínio do Evolution (o código só tem o placeholder)
- [ ] URL do n8n e como está protegido (basic auth? IP allowlist? Cloudflare?)
- [ ] Docker Compose / stack: quais containers sobem, com quais volumes
- [ ] Proxy reverso (Nginx? Caddy? Traefik?) e como os certificados TLS renovam
- [ ] Backups: o quê, com que frequência, para onde, e **quando foi o último restore testado**
- [ ] Firewall: quais portas estão abertas para a internet
- [ ] Versão do Evolution API instalada
- [ ] Export JSON dos workflows do n8n (principalmente o pipeline de incidentes)
- [ ] Onde ficam os logs do n8n e por quanto tempo

> [!tip] Nunca colar aqui
> Chaves e tokens (`EVOLUTION_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
> token do Telegram, PAT do GitHub). Documente **onde** cada segredo vive, não
> o valor.

---

## Próximos passos sugeridos

1. Dedupe + teto diário no agente de erros (risco vivo hoje).
2. Heartbeat no n8n para os 4 crons e para `/instance/connectionState` de cada
   instância Evolution — cobre a falha invisível.
3. Backup automatizado do volume de sessões do Baileys + banco do n8n, **com
   restore testado uma vez**.
4. Preencher as lacunas acima.
