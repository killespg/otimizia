-- Central de atendimento WhatsApp: instância Evolution API por organização,
-- conversas (uma por número de contato) e mensagens, com resposta automática
-- via Claude que pode ser pausada por conversa. Mesmo eixo de isolamento de
-- 0020 (org_id + is_org_member), não owner_id.

create table public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) not null,
  instance_name text unique not null,
  status text not null default 'pendente' check (status in ('pendente', 'conectado', 'desconectado')),
  phone_number text,
  created_at timestamptz not null default now(),
  unique (org_id)
);

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) not null,
  contact_id uuid references public.contacts(id),
  phone_number text not null,
  contact_name text,
  ia_active boolean not null default true,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (org_id, phone_number)
);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.whatsapp_conversations(id) not null,
  org_id uuid references public.organizations(id) not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null default 'text' check (message_type in ('text', 'image', 'audio', 'document', 'unsupported')),
  content text,
  media_url text,
  sent_by text not null default 'contact' check (sent_by in ('ai', 'human', 'contact')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Dedupe de eventos do webhook Evolution, mesmo padrão de stripe_webhook_events
-- (0002/0006): insere primeiro, unique-violation (23505) = replay já tratado.
create table public.whatsapp_webhook_events (
  event_id text primary key,
  event_type text,
  created_at timestamptz not null default now()
);

create index whatsapp_conversations_org_last_message_idx
  on public.whatsapp_conversations (org_id, last_message_at desc);
create index whatsapp_messages_conversation_idx
  on public.whatsapp_messages (conversation_id, created_at);

alter table public.whatsapp_instances enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_webhook_events enable row level security;

-- Conectar/desconectar o WhatsApp da empresa é ação de admin; qualquer membro
-- só precisa ler o status pra tela de configurações.
create policy "whatsapp_instances_select_member" on public.whatsapp_instances
  for select using (public.is_org_member(org_id));
create policy "whatsapp_instances_write_admin" on public.whatsapp_instances
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- Conversas e mensagens: qualquer membro da org vê e responde (mesma central
-- de atendimento compartilhada, igual contacts/deals em 0020). O webhook e o
-- envio da IA gravam via service role (bypassa RLS); estas policies cobrem o
-- app (leitura da lista/thread, toggle de IA, envio manual).
create policy "whatsapp_conversations_all_org" on public.whatsapp_conversations
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy "whatsapp_messages_all_org" on public.whatsapp_messages
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- whatsapp_webhook_events: só a service role toca (nenhuma policy pra
-- anon/authenticated), igual stripe_webhook_events.
