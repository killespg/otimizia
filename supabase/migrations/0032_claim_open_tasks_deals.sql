-- "Deixar em aberto": admin posta tarefa/negócio sem responsável
-- (assignee_id null) e qualquer membro da organização pode pegar pra si.
-- claim_* é atômico (update ... where assignee_id is null) pra garantir que só
-- quem clicar primeiro consegue, mesmo com dois cliques ao mesmo tempo.
create or replace function public.claim_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from public.tasks where id = p_task_id;
  if v_org_id is null or not public.is_org_member(v_org_id) then
    raise exception 'not authorized';
  end if;

  update public.tasks
  set assignee_id = auth.uid()
  where id = p_task_id and assignee_id is null;

  if not found then
    raise exception 'Essa tarefa já foi pega por alguém.';
  end if;
end;
$$;

create or replace function public.claim_deal(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from public.deals where id = p_deal_id;
  if v_org_id is null or not public.is_org_member(v_org_id) then
    raise exception 'not authorized';
  end if;

  update public.deals
  set assignee_id = auth.uid()
  where id = p_deal_id and assignee_id is null;

  if not found then
    raise exception 'Esse negócio já foi pego por alguém.';
  end if;
end;
$$;

grant execute on function public.claim_task(uuid) to authenticated;
grant execute on function public.claim_deal(uuid) to authenticated;
