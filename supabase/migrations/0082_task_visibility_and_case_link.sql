-- Visibilidade de tarefas por membro/organização, vínculo de lembrete a caso
-- jurídico, e leitura de tarefas alheias só quando o modo efetivo permitir.

alter table public.organization_members
  add column if not exists task_visibility text not null default 'profile'
  check (task_visibility in ('profile', 'mixed', 'private'));

alter table public.organizations
  add column if not exists task_visibility_locked boolean not null default false;

alter table public.organizations
  add column if not exists task_visibility_mode text not null default 'profile'
  check (task_visibility_mode in ('profile', 'mixed', 'private'));

alter table public.tasks
  add column if not exists case_id uuid references public.legal_cases(id) on delete set null;

alter table public.tasks
  add column if not exists notes text;

create index if not exists tasks_case_idx on public.tasks (case_id);

-- A 0072 revoga UPDATE de tasks do authenticated e reconcede via allowlist de
-- colunas. As colunas novas da 0082 precisam entrar na allowlist, senão
-- salvar lembrete com caso vinculado/observações falha com 42501.
grant update (case_id, notes) on public.tasks to authenticated;

grant update (
  name,
  business_context,
  business_priorities,
  ai_tone,
  ai_instructions,
  industry,
  region,
  team_size,
  website,
  extra_notes,
  onboarded_at,
  workspace_preferences,
  task_visibility_locked,
  task_visibility_mode
) on public.organizations to authenticated;

create or replace function public.effective_task_visibility(p_org uuid, p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce((select o.task_visibility_locked from public.organizations o where o.id = p_org), false)
      then coalesce((select o.task_visibility_mode from public.organizations o where o.id = p_org), 'profile')
    else coalesce((
      select m.task_visibility
      from public.organization_members m
      where m.org_id = p_org and m.user_id = p_user
    ), 'profile')
  end;
$$;

revoke all on function public.effective_task_visibility(uuid, uuid) from public, anon;
grant execute on function public.effective_task_visibility(uuid, uuid) to authenticated, service_role;

drop policy if exists "tasks_all_org" on public.tasks;

drop policy if exists "tasks_select_visible" on public.tasks;
create policy "tasks_select_visible" on public.tasks
  for select using (
    public.is_org_member(org_id)
    and (
      auth.uid() = owner_id
      or auth.uid() = assignee_id
      or auth.uid() = pending_assignee_id
      or auth.uid() = reviewer_id
      or (
        public.effective_task_visibility(org_id, auth.uid()) <> 'private'
        and public.effective_task_visibility(org_id, coalesce(assignee_id, owner_id)) <> 'private'
      )
    )
  );

drop policy if exists "tasks_insert_org" on public.tasks;
create policy "tasks_insert_org" on public.tasks
  for insert with check (public.is_org_member(org_id));

drop policy if exists "tasks_update_org" on public.tasks;
create policy "tasks_update_org" on public.tasks
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

drop policy if exists "tasks_delete_org" on public.tasks;
create policy "tasks_delete_org" on public.tasks
  for delete using (public.is_org_member(org_id));

create or replace function public.protect_member_core_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  locked boolean;
  privileged boolean;
begin
  privileged := public.is_org_admin(new.org_id)
    or public.org_job_role(new.org_id) in ('owner', 'managing_partner');

  if not privileged then
    if new.role is distinct from old.role or new.job_role is distinct from old.job_role then
      raise exception 'not authorized';
    end if;
  end if;

  select o.task_visibility_locked into locked
  from public.organizations o
  where o.id = new.org_id;

  if coalesce(locked, false) and not privileged
     and new.task_visibility is distinct from old.task_visibility then
    raise exception 'Definido pela organização.';
  end if;

  return new;
end;
$$;

drop trigger if exists organization_members_protect_core on public.organization_members;
create trigger organization_members_protect_core
  before update on public.organization_members
  for each row execute function public.protect_member_core_fields();

drop policy if exists "org_members_update_own_visibility" on public.organization_members;
create policy "org_members_update_own_visibility" on public.organization_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
