-- O fluxo de exclusão com código (EXCLUIR ABC123) foi substituído pela
-- confirmação por conversa: o Tim só chama a ferramenta de exclusão depois
-- que o usuário confirma no chat. A tabela e as RPCs da 0070 ficaram sem uso
-- no aplicativo; este cleanup remove o mecanismo antigo e suas grants.
drop function if exists public.consume_assistant_deletion_confirmation(uuid, text, text, uuid);
drop function if exists public.confirm_assistant_deletion(text);
drop function if exists public.request_assistant_deletion_confirmation(uuid, text, text, uuid, text);
drop table if exists public.assistant_deletion_confirmations;
