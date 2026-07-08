-- Espelha a distribuição de tarefas (0020_org_rls.sql) para negócios/casos:
-- responsável por card do funil, com pedido/aceite/recusa de transferência
-- entre membros da mesma organização, e reatribuição livre pelo admin.
alter table public.deals
  add column if not exists assignee_id uuid references auth.users(id) on delete set null,
  add column if not exists pending_assignee_id uuid references auth.users(id) on delete set null;

create or replace function public.request_deal_handoff(p_deal_id uuid, p_target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal record;
begin
  select id, org_id, owner_id, assignee_id into v_deal
  from public.deals where id = p_deal_id;

  if v_deal.id is null then
    raise exception 'Negócio não encontrado.';
  end if;
  if not public.is_org_member(v_deal.org_id) then
    raise exception 'not authorized';
  end if;
  if auth.uid() <> v_deal.owner_id
     and auth.uid() <> coalesce(v_deal.assignee_id, '00000000-0000-0000-0000-000000000000'::uuid)
     and not public.is_org_admin(v_deal.org_id) then
    raise exception 'not authorized';
  end if;
  if p_target_user is null then
    raise exception 'invalid target';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.org_id = v_deal.org_id and m.user_id = p_target_user
  ) then
    raise exception 'Esse usuário não faz parte da organização.';
  end if;

  update public.deals set pending_assignee_id = p_target_user where id = p_deal_id;
end;
$$;

create or replace function public.accept_deal_handoff(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.deals
  set assignee_id = pending_assignee_id, pending_assignee_id = null
  where id = p_deal_id and pending_assignee_id = auth.uid();

  if not found then
    raise exception 'not authorized';
  end if;
end;
$$;

create or replace function public.decline_deal_handoff(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.deals
  set pending_assignee_id = null
  where id = p_deal_id and pending_assignee_id = auth.uid();

  if not found then
    raise exception 'not authorized';
  end if;
end;
$$;

create or replace function public.admin_reassign_deal(p_deal_id uuid, p_assignee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from public.deals where id = p_deal_id;
  if v_org_id is null or not public.is_org_admin(v_org_id) then
    raise exception 'not authorized';
  end if;
  if p_assignee_id is not null and not exists (
    select 1 from public.organization_members m
    where m.org_id = v_org_id and m.user_id = p_assignee_id
  ) then
    raise exception 'Esse usuário não faz parte da organização.';
  end if;

  update public.deals
  set assignee_id = p_assignee_id, pending_assignee_id = null
  where id = p_deal_id;
end;
$$;

grant execute on function public.request_deal_handoff(uuid, uuid) to authenticated;
grant execute on function public.accept_deal_handoff(uuid) to authenticated;
grant execute on function public.decline_deal_handoff(uuid) to authenticated;
grant execute on function public.admin_reassign_deal(uuid, uuid) to authenticated;

revoke update (assignee_id, pending_assignee_id) on public.deals from anon, authenticated;
