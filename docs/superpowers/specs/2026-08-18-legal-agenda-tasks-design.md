# Agenda jurídica: lembretes pessoais e visibilidade da equipe

## Objetivo

A aba **Agenda e prazos** deixa de listar a carteira de processos. Ela passa a ser a fila pessoal de tarefas e lembretes do advogado. Processos só entram nessa tela quando estão perto do vencimento ou quando o DataJud trouxe movimentação ainda não vista. A carteira compartilhada permanece em **Processos**.

## Superfícies

- `/painel/juridico/prazos` é a única aba de lembretes no workspace jurídico.
- `/painel/tarefas` redireciona para a agenda quando a workspace ativa é `law_office`.
- A navegação jurídica não duplica “Retornos do dia”.
- `/painel/equipe` lista membros com link para `/painel/equipe/[userId]`.
- `/painel/configuracoes` também expõe a escolha do próprio perfil no workspace jurídico.
- A visão geral jurídica, no modo misto, mostra tarefas alheias com etiqueta de nome.

## Visibilidade

Três modos, no perfil do membro (Configurações ou `/painel/equipe/[userId]`):

1. `profile` — Consultar no perfil. Ver as tarefas e lembretes alheios apenas se consultado no perfil da pessoa.
2. `mixed` — Misturar na agenda. Ver as tarefas e lembretes alheios na dashboard e na aba de Agenda e prazos, misturados com os seus, com etiqueta do nome.
3. `private` — Privado. Não ver alheios nem mostrar as tarefas e lembretes para nenhuma pessoa, mesmo mediante acesso no perfil.

Regra de cruzamento: a tarefa da Ana só aparece para o Bruno se a Ana não estiver `private` e o Bruno não estiver `private`. Entra misturada na agenda/dashboard do Bruno só se o Bruno estiver `mixed`.

Modo efetivo: se a organização travou a política, todos usam o modo da organização. Senão, cada membro usa o próprio, padrão `profile`.

Quem trava: dono, sócio gestor ou admin da organização, na aba Equipe. O seletor do membro fica bloqueado com o texto de que a escolha foi da organização.

## Tarefas

Campos: título, vencimento, observações, processo opcional, contato existente ou nome de empresa/contato novo.

Clique no lembrete abre a edição na própria agenda (`?editar=`). Processo vinculado, se houver, vira atalho dentro do formulário — não o destino do clique.

Atribuição: dono, sócio gestor e admin da org designam direto. Os demais criam para si e pedem transferência (`request_task_handoff`).

Cada um vê na agenda as tarefas em que é responsável, dono, alvo de transferência ou revisor — mais as alheias permitidas pelo modo.

## Sinais de processo na agenda

Um prazo/processo só entra na agenda se:

- a data civil em America/Sao_Paulo for hoje, atrasada ou até 7 dias à frente; ou
- o caso tiver processo acompanhado no DataJud com `last_movement_at` posterior a `seen_at`.

## Dados

- `organization_members.task_visibility`
- `organizations.task_visibility_locked`
- `organizations.task_visibility_mode`
- `tasks.case_id` (opcional, FK para `legal_cases`)
- `tasks.notes` (opcional)
