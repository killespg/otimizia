-- Anexos enviados ao Tim ficam privados e expiram. O bucket anterior
-- (deal-photos) e publico por necessidade das fotos comerciais.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assistant-attachments',
  'assistant-attachments',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.assistant_attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

alter table public.assistant_attachments enable row level security;

create policy "assistant_attachments_select_own"
on public.assistant_attachments for select
to authenticated
using (user_id = auth.uid() and public.is_org_member(org_id));

create policy "assistant_attachments_insert_own"
on public.assistant_attachments for insert
to authenticated
with check (user_id = auth.uid() and public.is_org_member(org_id));

create policy "assistant_attachments_delete_own"
on public.assistant_attachments for delete
to authenticated
using (user_id = auth.uid() and public.is_org_member(org_id));

create policy "assistant_attachments_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'assistant-attachments'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and ((storage.foldername(name))[2])::uuid = auth.uid()
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "assistant_attachments_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'assistant-attachments'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and ((storage.foldername(name))[2])::uuid = auth.uid()
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "assistant_attachments_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'assistant-attachments'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and ((storage.foldername(name))[2])::uuid = auth.uid()
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

-- A IA nunca recebe um booleano de confirmacao que ela mesma possa inventar.
-- O servidor so confirma quando o texto do usuario contem o codigo emitido
-- num turno anterior; a exclusao consome essa autorizacao uma unica vez.
create table if not exists public.assistant_deletion_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null check (char_length(workspace_key) between 1 and 80),
  entity_table text not null check (entity_table in ('contacts', 'deals', 'tasks')),
  entity_id uuid not null,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  confirmed_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

create index if not exists assistant_deletion_confirmation_lookup_idx
on public.assistant_deletion_confirmations
  (user_id, org_id, workspace_key, entity_table, entity_id, created_at desc);

alter table public.assistant_deletion_confirmations enable row level security;

create or replace function public.request_assistant_deletion_confirmation(
  p_org_id uuid,
  p_workspace_key text,
  p_entity_table text,
  p_entity_id uuid,
  p_code_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_org_member(p_org_id) then
    raise exception 'Nao autorizado.';
  end if;
  if p_entity_table not in ('contacts', 'deals', 'tasks') then
    raise exception 'Tipo de registro invalido.';
  end if;
  if p_workspace_key is null or char_length(p_workspace_key) not between 1 and 80 then
    raise exception 'Workspace invalida.';
  end if;
  if p_entity_id is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Confirmacao invalida.';
  end if;

  update public.assistant_deletion_confirmations
  set expires_at = now()
  where user_id = auth.uid()
    and org_id = p_org_id
    and workspace_key = p_workspace_key
    and entity_table = p_entity_table
    and entity_id = p_entity_id
    and consumed_at is null;

  insert into public.assistant_deletion_confirmations (
    user_id, org_id, workspace_key, entity_table, entity_id, code_hash
  )
  values (
    auth.uid(), p_org_id, p_workspace_key, p_entity_table, p_entity_id, p_code_hash
  );
end;
$$;

create or replace function public.confirm_assistant_deletion(p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then return false; end if;
  if p_code_hash !~ '^[0-9a-f]{64}$' then return false; end if;

  select id into v_id
  from public.assistant_deletion_confirmations
  where user_id = auth.uid()
    and code_hash = p_code_hash
    and confirmed_at is null
    and consumed_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_id is null then return false; end if;
  update public.assistant_deletion_confirmations set confirmed_at = now() where id = v_id;
  return true;
end;
$$;

create or replace function public.consume_assistant_deletion_confirmation(
  p_org_id uuid,
  p_workspace_key text,
  p_entity_table text,
  p_entity_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_org_member(p_org_id) then return false; end if;

  select id into v_id
  from public.assistant_deletion_confirmations
  where user_id = auth.uid()
    and org_id = p_org_id
    and workspace_key = p_workspace_key
    and entity_table = p_entity_table
    and entity_id = p_entity_id
    and confirmed_at is not null
    and consumed_at is null
    and expires_at > now()
  order by confirmed_at desc
  limit 1
  for update skip locked;

  if v_id is null then return false; end if;
  update public.assistant_deletion_confirmations set consumed_at = now() where id = v_id;
  return true;
end;
$$;

revoke all on function public.request_assistant_deletion_confirmation(uuid, text, text, uuid, text) from public, anon;
revoke all on function public.confirm_assistant_deletion(text) from public, anon;
revoke all on function public.consume_assistant_deletion_confirmation(uuid, text, text, uuid) from public, anon;
grant execute on function public.request_assistant_deletion_confirmation(uuid, text, text, uuid, text) to authenticated;
grant execute on function public.confirm_assistant_deletion(text) to authenticated;
grant execute on function public.consume_assistant_deletion_confirmation(uuid, text, text, uuid) to authenticated;
