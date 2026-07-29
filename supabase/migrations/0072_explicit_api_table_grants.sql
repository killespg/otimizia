-- O Supabase hospedado aplica grants padrão quando uma tabela nasce pelo
-- dashboard. O reset local, porém, executa estas migrations como `postgres`,
-- cujo default privilege deliberadamente não inclui CRUD para as roles da API.
-- Sem grants explícitos, o schema local parece saudável mas toda consulta
-- autenticada falha com 42501 antes mesmo de a RLS ser avaliada.

grant all privileges on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;

-- A RLS continua sendo a fronteira de acesso por linha. `anon` não recebe
-- acesso direto às tabelas: as páginas públicas usam apenas RPCs
-- security-definer concedidas individualmente nas migrations de origem.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Campos de assinatura e cobrança nunca podem ser alterados pelo cliente.
-- Mantemos apenas as preferências e os dados de perfil editáveis pelo produto.
revoke update on public.profiles from authenticated;
grant update (
  name,
  profession_type,
  profession_types,
  active_org_id,
  dashboard_preferences,
  checklist_dismissed_at,
  favorite_tribunals,
  real_estate_v2_intro_dismissed_at
) on public.profiles to authenticated;

revoke update on public.organizations from authenticated;
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
  workspace_preferences
) on public.organizations to authenticated;

-- Responsável, aceite de repasse e revisão de tarefa são transições de
-- servidor/RPC. Geramos a allowlist a partir do schema para não bloquear os
-- demais campos operacionais quando uma coluna comum for adicionada.
revoke update on public.tasks from authenticated;
do $$
declare
  allowed_columns text;
begin
  select string_agg(format('%I', column_name), ', ' order by ordinal_position)
    into allowed_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'tasks'
    and column_name not in (
      'assignee_id',
      'pending_assignee_id',
      'reviewer_id',
      'review_status',
      'submitted_at',
      'reviewed_at',
      'review_note'
    );

  execute format(
    'grant update (%s) on public.tasks to authenticated',
    allowed_columns
  );
end;
$$;

revoke update on public.deals from authenticated;
do $$
declare
  allowed_columns text;
begin
  select string_agg(format('%I', column_name), ', ' order by ordinal_position)
    into allowed_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'deals'
    and column_name not in ('assignee_id', 'pending_assignee_id');

  execute format(
    'grant update (%s) on public.deals to authenticated',
    allowed_columns
  );
end;
$$;
