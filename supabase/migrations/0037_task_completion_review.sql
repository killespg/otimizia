-- Entrega de tarefas para revisao do chefe/criador.
alter table public.tasks
  add column if not exists reviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists review_status text not null default 'not_required'
    check (review_status in ('not_required','in_progress','submitted','changes_requested','approved')),
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

create index if not exists tasks_reviewer_status_idx
  on public.tasks(org_id, reviewer_id, review_status);

-- Tarefas delegadas existentes passam a exigir aceite do criador.
update public.tasks
set reviewer_id = owner_id,
    review_status = case when done then 'approved' else 'in_progress' end,
    submitted_at = case when done then created_at else null end,
    reviewed_at = case when done then created_at else null end
where assignee_id is not null and assignee_id <> owner_id and reviewer_id is null;

create or replace function public.submit_task_for_review(p_task_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id=p_task_id;
  if v_task.id is null or not public.is_org_member(v_task.org_id) then raise exception 'Tarefa nao encontrada.'; end if;
  if auth.uid() <> v_task.assignee_id then raise exception 'Somente o responsavel pode entregar esta tarefa.'; end if;
  if v_task.reviewer_id is null then raise exception 'Esta tarefa nao exige revisao.'; end if;
  update public.tasks set done=false, review_status='submitted', submitted_at=now(), reviewed_at=null, review_note=null where id=p_task_id;
end; $$;

create or replace function public.review_task_completion(p_task_id uuid, p_approved boolean, p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_task public.tasks%rowtype; v_can_review boolean;
begin
  select * into v_task from public.tasks where id=p_task_id;
  if v_task.id is null or not public.is_org_member(v_task.org_id) then raise exception 'Tarefa nao encontrada.'; end if;
  v_can_review := auth.uid()=v_task.reviewer_id or public.is_org_admin(v_task.org_id)
    or public.org_job_role(v_task.org_id) in ('owner','managing_partner');
  if not v_can_review then raise exception 'Voce nao pode revisar esta tarefa.'; end if;
  if v_task.review_status <> 'submitted' then raise exception 'A tarefa nao esta aguardando revisao.'; end if;
  update public.tasks set
    done=p_approved,
    review_status=case when p_approved then 'approved' else 'changes_requested' end,
    reviewed_at=now(), review_note=nullif(left(trim(coalesce(p_note,'')),800),'')
  where id=p_task_id;
end; $$;

grant execute on function public.submit_task_for_review(uuid) to authenticated;
grant execute on function public.review_task_completion(uuid,boolean,text) to authenticated;
revoke update (reviewer_id,review_status,submitted_at,reviewed_at,review_note) on public.tasks from anon,authenticated;
