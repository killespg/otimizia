-- Toda função nasce com EXECUTE para PUBLIC. Como o PostgREST expõe o schema
-- `public` em /rest/v1/rpc, isso significa que as funções SECURITY DEFINER
-- deste banco eram chamáveis por qualquer pessoa com a chave anônima — que é
-- pública por natureza, vai no HTML. E SECURITY DEFINER ignora RLS: a única
-- proteção era cada função checar auth.uid() por conta própria.
--
-- O ponto importante: revogar do papel `anon` não resolveria, porque o acesso
-- não vem de um grant para `anon`, vem do PUBLIC. É preciso revogar do PUBLIC
-- e devolver explicitamente para quem precisa.
--
-- As migrations 0069 e 0070 já faziam isso para as funções que criaram. Esta
-- aplica o mesmo padrão ao resto, e passa a valer para funções futuras por
-- construção: o laço varre pg_proc em vez de listar nomes à mão, então uma
-- função SECURITY DEFINER nova não escapa por esquecimento.

do $$
declare
  fn record;
  -- Únicas alcançáveis sem login, e por desenho: são as páginas públicas de
  -- compartilhamento (/share/*), onde o visitante não tem conta. O token no
  -- argumento é o que autoriza, e a própria função valida.
  publicas text[] := array[
    'get_shared_case',
    'get_shared_property_collection',
    'record_property_reaction'
  ];
begin
  for fn in
    select p.oid,
           p.proname,
           pg_get_function_result(p.oid) = 'trigger' as e_gatilho
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      fn.oid::regprocedure
    );

    -- O servidor (rotas de API, webhooks, crons) continua com tudo.
    execute format('grant execute on function %s to service_role', fn.oid::regprocedure);

    if fn.e_gatilho then
      -- Função de gatilho não é para ser chamada por ninguém: o disparo do
      -- trigger não consulta EXECUTE do usuário. Estavam expostas como RPC
      -- por acidente — handle_new_user, sync_profile_email e companhia.
      continue;
    end if;

    execute format('grant execute on function %s to authenticated', fn.oid::regprocedure);

    if fn.proname = any(publicas) then
      execute format('grant execute on function %s to anon', fn.oid::regprocedure);
    end if;
  end loop;
end;
$$;
