-- Recorrência de lembretes: ao concluir uma tarefa recorrente, uma próxima
-- ocorrência é criada automaticamente (devido em +1 dia/semana/mês).
-- recurrence_spawned evita duplicar a próxima ocorrência se a tarefa for
-- marcada como concluída mais de uma vez (desfazer e refazer o check).
alter table public.tasks add column recurrence text not null default 'none'
  check (recurrence in ('none', 'daily', 'weekly', 'monthly'));
alter table public.tasks add column recurrence_spawned boolean not null default false;
