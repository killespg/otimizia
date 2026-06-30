# OtimizIA — CRM simples para quem vende sozinho

CRM simples para quem vende sozinho organizar clientes, acompanhar vendas e
lembrar de chamar cada pessoa na hora certa.

Construído com **Next.js (App Router) + TypeScript + Tailwind CSS + Supabase
(Postgres + Auth)**.

## Funcionalidades

- **Autenticação** por e-mail e senha (Supabase Auth).
- **Contatos**: cadastro de clientes/leads com telefone, e-mail, empresa,
  origem e observações.
- **Vendas em etapas**: vendas em colunas (Novo → Em contato →
  Proposta → Ganho / Perdido), com arrastar-e-soltar.
- **Lembretes**: clientes para chamar hoje, depois ou em atraso.
- **Conversas**: registre ligações, mensagens e observações por cliente.
- **Painel**: clientes, vendas abertas, valor em aberto e recebido no mês.

Cada usuário só enxerga os próprios dados (Row Level Security no Postgres).

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

Preencha:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

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
  (app)/         área autenticada: dashboard, contacts, pipeline, tasks
lib/supabase/    clients (server, browser, middleware) e tipos
supabase/migrations/  schema SQL + RLS
```

## Próximos passos (fora do MVP)

- Planos pagos com Stripe.
- Integração com WhatsApp / e-mail.
- Multiusuário (equipes).
- Landing page de marketing e SEO.
