-- Fecha a regressao introduzida por 0073: funcoes SECURITY DEFINER nao podem
-- ser liberadas em bloco para authenticated. A lista abaixo e intencional e
-- separa helpers/RPCs de produto das funcoes internas de infraestrutura.

-- A folga de sessao de voz e uma regra do servidor, nao uma entrada confiavel
-- do cliente. Mantemos a assinatura por compatibilidade, mas rejeitamos
-- qualquer tentativa de alterar os 30 segundos e retiramos o EXECUTE direto
-- de authenticated; start_voice_session() continua chamando-a como owner.
create or replace function public.close_stale_voice_sessions(
  p_grace_seconds integer default 30
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_session record;
  v_elapsed integer;
  v_grace_seconds constant integer := 30;
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;
  if p_grace_seconds is distinct from v_grace_seconds then
    raise exception 'invalid grace interval';
  end if;

  for v_session in
    select *
    from public.voice_sessions
    where owner_id = v_owner and closed_at is null
    for update
  loop
    v_elapsed := least(
      greatest(0, extract(epoch from (now() - v_session.last_heartbeat_at))::integer),
      v_grace_seconds
    );
    if v_elapsed > 0 then
      perform public.increment_voice_usage(v_elapsed);
    end if;
    update public.voice_sessions
    set closed_at = now()
    where id = v_session.id;
  end loop;
end;
$$;

do $$
declare
  fn record;
begin
  for fn in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      fn.oid::regprocedure
    );
    execute format(
      'grant execute on function %s to service_role',
      fn.oid::regprocedure
    );
  end loop;
end;
$$;

-- Helpers usados pelas policies RLS. Todos derivam a identidade de auth.uid().
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.shares_org_with(uuid) to authenticated;
grant execute on function public.org_job_role(uuid) to authenticated;
grant execute on function public.can_view_legal(uuid) to authenticated;
grant execute on function public.can_manage_legal(uuid) to authenticated;
grant execute on function public.can_view_finance(uuid) to authenticated;
grant execute on function public.can_manage_finance(uuid) to authenticated;
grant execute on function public.can_access_legal_case(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.can_view_realestate(uuid) to authenticated;
grant execute on function public.can_manage_realestate(uuid) to authenticated;

-- RPCs autenticadas que implementam operacoes atomicas do produto.
grant execute on function public.request_task_handoff(uuid, uuid) to authenticated;
grant execute on function public.accept_task_handoff(uuid) to authenticated;
grant execute on function public.decline_task_handoff(uuid) to authenticated;
grant execute on function public.admin_reassign_task(uuid, uuid) to authenticated;
grant execute on function public.request_deal_handoff(uuid, uuid) to authenticated;
grant execute on function public.accept_deal_handoff(uuid) to authenticated;
grant execute on function public.decline_deal_handoff(uuid) to authenticated;
grant execute on function public.admin_reassign_deal(uuid, uuid) to authenticated;
grant execute on function public.claim_task(uuid) to authenticated;
grant execute on function public.claim_deal(uuid) to authenticated;
grant execute on function public.submit_task_for_review(uuid) to authenticated;
grant execute on function public.review_task_completion(uuid, boolean, text) to authenticated;
grant execute on function public.start_voice_session() to authenticated;
grant execute on function public.checkpoint_voice_session(uuid, boolean) to authenticated;
grant execute on function public.switch_seller_collection(uuid, text, date, date, text, uuid, uuid[]) to authenticated;
grant execute on function public.adjust_seller_stock(uuid, uuid, integer, text) to authenticated;
grant execute on function public.confirm_seller_sale(uuid, jsonb, text, text, bigint, bigint, text) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.request_assistant_deletion_confirmation(uuid, text, text, uuid, text) to authenticated;
grant execute on function public.confirm_assistant_deletion(text) to authenticated;
grant execute on function public.consume_assistant_deletion_confirmation(uuid, text, text, uuid) to authenticated;

-- Compartilhamentos publicos continuam autorizados pelo token do argumento.
grant execute on function public.get_shared_case(uuid) to anon, authenticated;
grant execute on function public.get_shared_property_collection(uuid) to anon, authenticated;
grant execute on function public.record_property_reaction(uuid, uuid, text) to anon, authenticated;

-- Infraestrutura de custo e manutencao permanece exclusivamente server-side.
revoke all on function public.increment_ai_rate_limit(text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.increment_voice_usage(integer)
  from public, anon, authenticated;
revoke all on function public.close_stale_voice_sessions(integer)
  from public, anon, authenticated;

-- Todas as linhas dependentes da organizacao precisam sair na mesma exclusao.
-- Sem estes ON DELETE, a limpeza de uma conta pessoal podia deixar a empresa
-- vazia porque as tabelas antigas do WhatsApp bloqueavam o delete.
alter table public.whatsapp_instances
  drop constraint if exists whatsapp_instances_org_id_fkey,
  add constraint whatsapp_instances_org_id_fkey
    foreign key (org_id) references public.organizations(id) on delete cascade;

alter table public.whatsapp_conversations
  drop constraint if exists whatsapp_conversations_org_id_fkey,
  add constraint whatsapp_conversations_org_id_fkey
    foreign key (org_id) references public.organizations(id) on delete cascade;

alter table public.whatsapp_messages
  drop constraint if exists whatsapp_messages_conversation_id_fkey,
  add constraint whatsapp_messages_conversation_id_fkey
    foreign key (conversation_id) references public.whatsapp_conversations(id) on delete cascade,
  drop constraint if exists whatsapp_messages_org_id_fkey,
  add constraint whatsapp_messages_org_id_fkey
    foreign key (org_id) references public.organizations(id) on delete cascade;
