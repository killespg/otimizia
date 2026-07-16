-- Fundação de segurança e rollout (item 0.3, Fase 0 do roadmap do CRM
-- imobiliário): log de auditoria para mudanças de papel/permissão dentro de
-- uma organização. A classe de bug que a própria 0.3 chama de prioritária é
-- vazamento de dado entre corretores da mesma equipe, não um bug visual —
-- então o primeiro alvo de auditoria é quem entra, sai ou muda de
-- role/job_role numa organização, não qualquer tabela de negócio.
--
-- Não cria nenhuma permissão nova (isso é 3.4, Fase 3) — só torna auditável
-- o que já existe hoje em organization_members.
--
-- Reversível: rollback = numa migration nova,
--   drop trigger if exists organization_members_audit on public.organization_members;
--   drop function if exists public.log_organization_member_change();
--   drop table if exists public.audit_log;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_table text not null,
  resource_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_idx on public.audit_log (org_id, created_at desc);

alter table public.audit_log enable row level security;

-- Só quem é admin da própria organização lê o log dela. Nenhuma policy de
-- insert/update/delete é concedida a authenticated — a única forma de
-- escrever é a função abaixo (security definer, chamada só pelo trigger).
-- Isso vale tanto pra ataque quanto pra erro de operação: nem o próprio
-- admin edita ou apaga uma entrada do log pelo client.
create policy "audit_log_select_admin" on public.audit_log
  for select using (public.is_org_admin(org_id));

create or replace function public.log_organization_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (org_id, actor_id, action, resource_table, resource_id, before, after)
    values (
      new.org_id, auth.uid(), 'member_added', 'organization_members', new.user_id,
      null, jsonb_build_object('user_id', new.user_id, 'role', new.role, 'job_role', new.job_role)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role or new.job_role is distinct from old.job_role then
      insert into public.audit_log (org_id, actor_id, action, resource_table, resource_id, before, after)
      values (
        new.org_id, auth.uid(), 'member_role_changed', 'organization_members', new.user_id,
        jsonb_build_object('role', old.role, 'job_role', old.job_role),
        jsonb_build_object('role', new.role, 'job_role', new.job_role)
      );
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (org_id, actor_id, action, resource_table, resource_id, before, after)
    values (
      old.org_id, auth.uid(), 'member_removed', 'organization_members', old.user_id,
      jsonb_build_object('user_id', old.user_id, 'role', old.role, 'job_role', old.job_role), null
    );
    return old;
  end if;
  return null;
end;
$$;

-- auth.uid() é null quando a mudança vem do trigger de signup
-- (handle_new_user, 0035/0051) em vez de uma chamada autenticada via
-- PostgREST — nesse caso actor_id fica null de propósito: é o sistema
-- criando o primeiro vínculo do usuário novo, não uma ação de um admin.
create trigger organization_members_audit
  after insert or update or delete on public.organization_members
  for each row execute function public.log_organization_member_change();
