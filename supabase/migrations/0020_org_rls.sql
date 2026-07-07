-- RLS por organização: troca o eixo de isolamento de owner_id (pessoa) para
-- org_id (empresa) — dentro da mesma org os dados agora são compartilhados
-- entre todos os membros, não mais isolados por pessoa.

create or replace function public.is_org_member(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = target and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = target and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

create or replace function public.shares_org_with(target_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m1
    join public.organization_members m2 on m1.org_id = m2.org_id
    where m1.user_id = auth.uid() and m2.user_id = target_user
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.shares_org_with(uuid) to authenticated;

-- organizations: membro lê, só admin atualiza (billing continua bloqueado
-- via grant de coluna em 0015, mesmo padrão de 0008 para profiles).
alter table public.organizations enable row level security;
create policy "organizations_select_member" on public.organizations
  for select using (public.is_org_member(id));
create policy "organizations_update_admin" on public.organizations
  for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));

-- organization_members: membro lê a lista da própria org; só admin
-- adiciona/promove/remove.
alter table public.organization_members enable row level security;
create policy "org_members_select_member" on public.organization_members
  for select using (public.is_org_member(org_id));
create policy "org_members_update_admin" on public.organization_members
  for update using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "org_members_delete_admin" on public.organization_members
  for delete using (public.is_org_admin(org_id));

-- profiles: além de ver o próprio, membro pode ver o nome de quem compartilha
-- organização (necessário para a página de equipe e o seletor de responsável).
create policy "profiles_select_org_peers" on public.profiles
  for select using (public.shares_org_with(id));

-- contacts / deals / tasks / interactions: troca as policies de owner_id
-- (pessoa) para org_id (empresa) — visibilidade e edição compartilhadas.
drop policy if exists "contacts_all_own" on public.contacts;
create policy "contacts_all_org" on public.contacts
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

drop policy if exists "deals_all_own" on public.deals;
create policy "deals_all_org" on public.deals
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

drop policy if exists "tasks_all_own" on public.tasks;
create policy "tasks_all_org" on public.tasks
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

drop policy if exists "interactions_all_own" on public.interactions;
create policy "interactions_all_org" on public.interactions
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- ---------------------------------------------------------------------
-- Distribuição de tarefas: assignee_id/pending_assignee_id só mudam por
-- estas funções (security definer, mesmo padrão de increment_voice_usage em
-- 0010) — nunca por UPDATE direto, senão qualquer membro poderia reatribuir
-- tarefa de qualquer um só por ser da mesma org (RLS de tasks acima é
-- permissiva por org). Criação de tarefa continua livre para já nascer
-- atribuída (insert não é afetado pelo revoke abaixo).
-- ---------------------------------------------------------------------

create or replace function public.request_task_handoff(p_task_id uuid, p_target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
begin
  select id, org_id, owner_id, assignee_id into v_task
  from public.tasks where id = p_task_id;

  if v_task.id is null then
    raise exception 'Lembrete não encontrado.';
  end if;
  if not public.is_org_member(v_task.org_id) then
    raise exception 'not authorized';
  end if;
  if auth.uid() <> v_task.owner_id
     and auth.uid() <> coalesce(v_task.assignee_id, '00000000-0000-0000-0000-000000000000'::uuid)
     and not public.is_org_admin(v_task.org_id) then
    raise exception 'not authorized';
  end if;
  if not public.is_org_member(v_task.org_id) or p_target_user is null then
    raise exception 'invalid target';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.org_id = v_task.org_id and m.user_id = p_target_user
  ) then
    raise exception 'Esse usuário não faz parte da organização.';
  end if;

  update public.tasks set pending_assignee_id = p_target_user where id = p_task_id;
end;
$$;

create or replace function public.accept_task_handoff(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tasks
  set assignee_id = pending_assignee_id, pending_assignee_id = null
  where id = p_task_id and pending_assignee_id = auth.uid();

  if not found then
    raise exception 'not authorized';
  end if;
end;
$$;

create or replace function public.decline_task_handoff(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tasks
  set pending_assignee_id = null
  where id = p_task_id and pending_assignee_id = auth.uid();

  if not found then
    raise exception 'not authorized';
  end if;
end;
$$;

create or replace function public.admin_reassign_task(p_task_id uuid, p_assignee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from public.tasks where id = p_task_id;
  if v_org_id is null or not public.is_org_admin(v_org_id) then
    raise exception 'not authorized';
  end if;
  if p_assignee_id is not null and not exists (
    select 1 from public.organization_members m
    where m.org_id = v_org_id and m.user_id = p_assignee_id
  ) then
    raise exception 'Esse usuário não faz parte da organização.';
  end if;

  update public.tasks
  set assignee_id = p_assignee_id, pending_assignee_id = null
  where id = p_task_id;
end;
$$;

grant execute on function public.request_task_handoff(uuid, uuid) to authenticated;
grant execute on function public.accept_task_handoff(uuid) to authenticated;
grant execute on function public.decline_task_handoff(uuid) to authenticated;
grant execute on function public.admin_reassign_task(uuid, uuid) to authenticated;

revoke update (assignee_id, pending_assignee_id) on public.tasks from anon, authenticated;
