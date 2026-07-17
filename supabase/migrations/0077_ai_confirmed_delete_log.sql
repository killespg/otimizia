-- 4.4 (Fase 4): copiloto — log de exclusão confirmada pela IA. audit_log
-- (0.3) não tem nenhuma policy de INSERT pra authenticated de propósito
-- (só o trigger de organization_members escreve) — então o client
-- session-scoped do assistente não consegue inserir direto. Esta função
-- é o único jeito adicional de escrever ali, e só registra exclusão que
-- já foi confirmada e executada (chamada por lib/ai/tools/write.ts,
-- deleteRow), nunca dado arbitrário.
--
-- Reversível: rollback = numa migration nova,
--   drop function if exists public.log_ai_confirmed_delete(uuid, text, uuid);
create or replace function public.log_ai_confirmed_delete(
  p_org_id uuid,
  p_resource_table text,
  p_resource_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'Não autorizado.';
  end if;
  if p_resource_table not in ('contacts', 'deals', 'tasks') then
    raise exception 'Tabela inválida.';
  end if;

  insert into public.audit_log (org_id, actor_id, action, resource_table, resource_id)
  values (p_org_id, auth.uid(), 'ai_confirmed_delete', p_resource_table, p_resource_id);
end;
$$;

grant execute on function public.log_ai_confirmed_delete(uuid, text, uuid) to authenticated;
