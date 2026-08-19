-- Lista as conversas do Tim para o usuário (mais recente primeiro), com um
-- preview da última mensagem e a data da última atividade. A conversa
-- "clássica" (anterior à 0085, sem conversation_id) aparece como uma conversa
-- normal com a chave nil. Roda como security invoker: as políticas de RLS de
-- assistant_messages continuam valendo, então cada usuário só vê as próprias.
create or replace function public.list_assistant_conversations(
  p_user_id uuid,
  p_org_id uuid,
  p_limit int default 50
)
returns table (
  conversation_id uuid,
  preview text,
  last_at timestamptz
)
language sql
security invoker
set search_path = public
as $$
  with grouped as (
    select
      coalesce(conversation_id, '00000000-0000-0000-0000-000000000000'::uuid) as conv_key,
      array_agg(content order by created_at desc) as contents,
      max(created_at) as last_at
    from public.assistant_messages
    where user_id = p_user_id and org_id = p_org_id
    group by coalesce(conversation_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  select conv_key, contents[1], last_at
  from grouped
  order by last_at desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.list_assistant_conversations(uuid, uuid, int) from public;
grant execute on function public.list_assistant_conversations(uuid, uuid, int) to authenticated;
