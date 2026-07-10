# OtimizIA — CRM com IA para quem vende ou presta serviço sozinho (ou em equipe)

CRM para autônomos e pequenas equipes organizarem clientes, acompanharem
vendas/casos e lembrarem de chamar cada pessoa na hora certa — com um
assistente de IA que opera o CRM por conversa (texto, foto e voz).

Construído com **Next.js (App Router) + TypeScript + Tailwind CSS + Supabase
(Postgres + Auth + Storage)**, **Anthropic Claude** (assistente), **OpenAI
Realtime** (voz) e **Stripe** (assinatura). Também publicado como app Android
via **Capacitor** (WebView apontando para o site em produção).

## Funcionalidades

- **Autenticação** por e-mail e senha (Supabase Auth).
- **Organizações multiusuário**: cada conta pertence a uma organização, com
  papéis (admin/membro), workspaces por área de atuação e Row Level Security
  por organização no Postgres.
- **Presets por profissão**: campos, etapas e templates de mensagem se
  adaptam ao tipo de negócio (vendedor autônomo, corretor, consultor,
  prestador de serviço, produtor rural, pequeno negócio, e um vertical
  dedicado para **escritório de advocacia** — prazos, casos, honorários e
  recebíveis).
- **Contatos**: cadastro de clientes/leads com telefone, e-mail, empresa,
  origem, observações e campos extras por profissão.
- **Vendas em etapas**: funil em colunas (Novo → Em contato → Proposta →
  Ganho / Perdido), com arrastar-e-soltar.
- **Lembretes/tarefas**: hoje, atrasados, concluídos, com transferência entre
  membros da equipe.
- **Conversas**: registre ligações, mensagens e observações por cliente.
- **Painel personalizável**: métricas, widgets, estilo e cor por usuário.
- **Assistente de IA**: chat que executa ações reais no CRM (criar/editar
  contatos, mover vendas, gerenciar tarefas, personalizar o painel), lê PDFs
  e fotos anexadas, e responde por voz.
- **Assinatura**: trial + plano pago via Stripe (checkout, portal, webhook).

## Configuração

### 1. Criar projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode a migration em
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (ou use a Supabase CLI — veja abaixo).
3. Em **Project Settings → API**, copie a `URL` e a `anon public key`.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha as variáveis do Supabase, Stripe, Anthropic e OpenAI descritas em
[`.env.example`](.env.example) (a maioria só é necessária em produção; para
rodar localmente com o essencial, `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY` já cobrem login e CRM).

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

### Usando a Supabase CLI (opcional)

```bash
npx supabase start          # sobe um Postgres + Auth local
npx supabase db reset       # aplica as migrations de supabase/migrations
```

## Estrutura

```
app/
  (auth)/        login, signup e server actions de autenticação
  (app)/         área autenticada: dashboard, contacts, pipeline, tasks,
                 team, settings, finance, law (vertical jurídico)
  api/           rotas HTTP: assistant (chat de IA), billing, webhooks/stripe,
                 realtime (voz)
lib/ai/          ferramentas do assistente de IA (CRM_TOOLS + executeTool)
lib/supabase/    clients (server, browser, admin, middleware) e tipos
supabase/migrations/  schema SQL + RLS (por usuário e por organização)
android/         projeto Capacitor (WebView apontando pro site em produção)
```

## Testes e CI

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (unidade — módulos puros/lib)
npm run build      # build de produção
```

Essas quatro checagens rodam automaticamente em CI a cada push/PR
(`.github/workflows/ci.yml`). A cobertura de testes ainda é limitada a
lógica pura (`lib/`); não há testes de integração contra o Supabase (RLS,
multi-tenancy) nem end-to-end — ver oportunidades abaixo.

## Próximos passos

- Testes de integração para RLS/multi-tenancy (precisa de Supabase local via
  Docker) e testes e2e (Playwright já está como devDependency).
- Integração com WhatsApp / e-mail.
