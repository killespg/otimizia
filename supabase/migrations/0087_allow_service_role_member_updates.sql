-- O trigger de proteção da 0082 só enxergava privilégio via auth.uid() —
-- is_org_admin/org_job_role leem o JWT do usuário autenticado. Com a chave
-- de serviço (service_role) o auth.uid() é NULL, então updates legítimos de
-- role/job_role feitos por rotas de servidor, scripts de fixture e testes de
-- integração falhavam com "not authorized". O service_role é o administrador
-- do backend e não pode ser bloqueado pela mesma regra de um membro comum.

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
  privileged := auth.role() = 'service_role'
    or public.is_org_admin(new.org_id)
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
