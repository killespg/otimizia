-- 3.4 (Fase 3): permissões granulares, com rollout por flag — "por flag,
-- organização a organização, nunca big-bang" (o próprio texto do roadmap
-- pra este item). Depende de 0.3 (matriz e testes de RLS já aprovados).
--
-- Estratégia de zero-regressão: policies RESTRICTIVE (não permissive) em
-- contacts/deals/tasks, condicionadas a organizations.granular_rbac_enabled.
-- RLS em Postgres faz OR entre policies permissive e AND entre
-- restrictive — então enquanto o flag estiver desligado (padrão, todas as
-- organizações existentes), a condição "not flag" na função abaixo é
-- sempre verdadeira e a restrictive policy nunca bloqueia nada. Isso é o
-- oposto de adicionar outra policy permissive (que não teria efeito
-- nenhum, já que contacts_all_org/deals_all_org/tasks_all_org de
-- 0020_org_rls.sql já concedem acesso amplo via OR).
--
-- Escopo: só "gerenciar" (update/delete) é restrito. "Ver" continua
-- liberado pra todo membro da organização com ou sem o flag — o roadmap
-- pede escopo em gerenciar, não em visualizar. Só "escopo próprio"
-- (assignee/owner) é coberto; "escopo equipe" (delegar por time) fica
-- pra uma iteração futura.
--
-- Reversível: rollback = numa migration nova,
--   drop policy if exists "contacts_manage_scope_update" on public.contacts;
--   drop policy if exists "contacts_manage_scope_delete" on public.contacts;
--   drop policy if exists "deals_manage_scope_update" on public.deals;
--   drop policy if exists "deals_manage_scope_delete" on public.deals;
--   drop policy if exists "tasks_manage_scope_update" on public.tasks;
--   drop policy if exists "tasks_manage_scope_delete" on public.tasks;
--   drop function if exists public.can_manage_crm_resource(uuid, uuid, uuid);
--   alter table public.organizations drop column if exists granular_rbac_enabled;

alter table public.organizations
  add column if not exists granular_rbac_enabled boolean not null default false;

-- Espelha exatamente lib/permissions.ts (canManageCrmResource) — mesmo
-- padrão de manter duas fontes de verdade em sincronia manual já usado
-- entre lib/real-estate.ts e can_view_realestate()/can_manage_realestate() (0051).
create or replace function public.can_manage_crm_resource(target_org uuid, target_assignee uuid, target_owner uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    not coalesce((select o.granular_rbac_enabled from public.organizations o where o.id = target_org), false)
    or public.is_org_admin(target_org)
    or public.org_job_role(target_org) in ('owner', 'broker', 'agent', 'managing_partner', 'lawyer')
    or auth.uid() = target_assignee
    or auth.uid() = target_owner;
$$;

grant execute on function public.can_manage_crm_resource(uuid, uuid, uuid) to authenticated;

create policy "contacts_manage_scope_update" on public.contacts
  as restrictive for update
  using (public.can_manage_crm_resource(org_id, null, owner_id));
create policy "contacts_manage_scope_delete" on public.contacts
  as restrictive for delete
  using (public.can_manage_crm_resource(org_id, null, owner_id));

create policy "deals_manage_scope_update" on public.deals
  as restrictive for update
  using (public.can_manage_crm_resource(org_id, assignee_id, owner_id));
create policy "deals_manage_scope_delete" on public.deals
  as restrictive for delete
  using (public.can_manage_crm_resource(org_id, assignee_id, owner_id));

create policy "tasks_manage_scope_update" on public.tasks
  as restrictive for update
  using (public.can_manage_crm_resource(org_id, assignee_id, owner_id));
create policy "tasks_manage_scope_delete" on public.tasks
  as restrictive for delete
  using (public.can_manage_crm_resource(org_id, assignee_id, owner_id));
