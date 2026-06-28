# MeuCRM — CRM simples para empreendedores individuais

CRM enxuto para autônomos, freelancers e pequenos empreendedores organizarem
contatos, acompanharem o funil de vendas e nunca perderem um follow-up.

Construído com **Next.js (App Router) + TypeScript + Tailwind CSS + Supabase
(Postgres + Auth)**.

## Funcionalidades

- **Autenticação** por e-mail e senha (Supabase Auth).
- **Contatos**: cadastro de clientes/leads com telefone, e-mail, empresa,
  origem e observações.
- **Funil de vendas (Kanban)**: negócios em colunas (Novo → Em contato →
  Negociação → Ganho / Perdido), com arrastar-e-soltar para mudar a etapa.
- **Tarefas e lembretes**: follow-ups com data, agrupados em atrasadas,
  para hoje, próximas e concluídas.
- **Histórico de interações**: registre conversas e ligações por contato.
- **Painel**: contatos, negócios em aberto, valor em negociação e ganho no mês.

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
