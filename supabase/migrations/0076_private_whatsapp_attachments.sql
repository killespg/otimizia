-- Imagens enviadas manualmente pelo inbox não podem usar deal-photos: esse
-- bucket é público para fotos comerciais. A Evolution recebe o base64
-- diretamente; o histórico usa uma rota autenticada que lê este bucket
-- privado. A retenção é explícita e o cron remove o objeto após 30 dias.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-attachments',
  'whatsapp-attachments',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.whatsapp_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.whatsapp_messages(id),
  org_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (
    media_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index whatsapp_attachments_expiry_idx
  on public.whatsapp_attachments(expires_at);

alter table public.whatsapp_attachments enable row level security;

create policy "whatsapp_attachments_select_member"
on public.whatsapp_attachments for select
to authenticated
using (public.is_org_member(org_id));

-- Upload e limpeza passam por rotas de servidor com service role. O navegador
-- não recebe insert/update/delete direto nem policy de storage.objects.
grant select on public.whatsapp_attachments to authenticated;
grant all privileges on public.whatsapp_attachments to service_role;

revoke insert, update, delete on public.whatsapp_attachments from authenticated;
