-- Separa contatos, negocios, tarefas e conversas por area ativa do usuario.

alter table public.contacts
  add column if not exists workspace_key text;

alter table public.deals
  add column if not exists workspace_key text;

alter table public.tasks
  add column if not exists workspace_key text;

alter table public.interactions
  add column if not exists workspace_key text;

update public.contacts c
set workspace_key = coalesce(p.profession_type, 'autonomous_seller')
from public.profiles p
where c.owner_id = p.id
  and c.workspace_key is null;

update public.deals d
set workspace_key = coalesce(p.profession_type, 'autonomous_seller')
from public.profiles p
where d.owner_id = p.id
  and d.workspace_key is null;

update public.tasks t
set workspace_key = coalesce(p.profession_type, 'autonomous_seller')
from public.profiles p
where t.owner_id = p.id
  and t.workspace_key is null;

update public.interactions i
set workspace_key = coalesce(p.profession_type, 'autonomous_seller')
from public.profiles p
where i.owner_id = p.id
  and i.workspace_key is null;

update public.contacts
set workspace_key = 'autonomous_seller'
where workspace_key is null;

update public.deals
set workspace_key = 'autonomous_seller'
where workspace_key is null;

update public.tasks
set workspace_key = 'autonomous_seller'
where workspace_key is null;

update public.interactions
set workspace_key = 'autonomous_seller'
where workspace_key is null;

alter table public.contacts
  alter column workspace_key set default 'autonomous_seller',
  alter column workspace_key set not null;

alter table public.deals
  alter column workspace_key set default 'autonomous_seller',
  alter column workspace_key set not null;

alter table public.tasks
  alter column workspace_key set default 'autonomous_seller',
  alter column workspace_key set not null;

alter table public.interactions
  alter column workspace_key set default 'autonomous_seller',
  alter column workspace_key set not null;

create index if not exists contacts_owner_workspace_idx
  on public.contacts (owner_id, workspace_key, created_at desc);

create index if not exists deals_owner_workspace_idx
  on public.deals (owner_id, workspace_key, created_at desc);

create index if not exists tasks_owner_workspace_idx
  on public.tasks (owner_id, workspace_key, due_at);

create index if not exists interactions_owner_workspace_idx
  on public.interactions (owner_id, workspace_key, created_at desc);
