-- Vertical imobiliário, Fase 3 do plano de evolução (RE-3xx): visitas e a
-- fila de eventos de domínio que dispara as automações.
--
-- crm_domain_events processa SÍNCRONO, no próprio fluxo que gera o evento
-- (RPC ou server action) — é uma fila em Postgres só pra auditoria/retry
-- manual, não um worker separado (não faz sentido a infra deste projeto
-- ainda, conforme instrução explícita do plano).
--
-- Reversível: rollback = rodar numa migration nova:
--   drop table if exists public.crm_domain_events;
--   drop table if exists public.real_estate_visits;
--   alter table public.whatsapp_messages drop constraint if exists whatsapp_messages_sent_by_check;
--   alter table public.whatsapp_messages add constraint whatsapp_messages_sent_by_check
--     check (sent_by in ('ai', 'human', 'contact'));
--   alter table public.notification_preferences drop column if exists visit_reminders_enabled;
--   drop index if exists notification_log_entity_kind_unique;
--   alter table public.notification_log
--     drop column if exists entity_id,
--     alter column sent_for_date set not null,
--     drop constraint if exists notification_log_kind_check,
--     add constraint notification_log_kind_check
--       check (kind in ('daily_push','daily_summary_email','stalled_deal_email'));
--   -- e recriar record_property_reaction exatamente como estava em 0059.

create table public.real_estate_visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  deal_id uuid,
  property_id uuid not null,
  broker_id uuid not null references auth.users(id) on delete restrict,
  -- Nullable: "quero visitar" cria a solicitação antes de existir horário
  -- combinado — vira 'scheduled' só quando o corretor define scheduled_at.
  scheduled_at timestamptz,
  duration_minutes integer not null default 45 check (duration_minutes > 0),
  status text not null default 'requested'
    check (status in ('requested', 'scheduled', 'completed', 'no_show', 'cancelled')),
  confirmation_status text not null default 'pending'
    check (confirmation_status in ('pending', 'confirmed', 'declined')),
  client_feedback text,
  broker_notes text,
  reminder_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, contact_id) references public.contacts(org_id, id) on delete cascade,
  foreign key (org_id, deal_id) references public.deals(org_id, id) on delete set null,
  foreign key (org_id, property_id) references public.real_estate_properties(org_id, id) on delete cascade
);
create index real_estate_visits_broker_scheduled_idx on public.real_estate_visits(broker_id, scheduled_at);
create index real_estate_visits_org_status_idx on public.real_estate_visits(org_id, status);
create index real_estate_visits_deal_idx on public.real_estate_visits(deal_id);

create trigger real_estate_visits_touch
  before update on public.real_estate_visits
  for each row execute function public.touch_real_estate_record();

alter table public.real_estate_visits enable row level security;
create policy "real_estate_visits_select" on public.real_estate_visits
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_visits_write" on public.real_estate_visits
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));

-- Fila de eventos de domínio (não exclusiva do imobiliário, mas nasce aqui
-- porque é a primeira automação do produto) — audita o que aconteceu e se
-- o processamento síncrono deu certo. idempotency_key evita duplicar o
-- mesmo evento em caso de retry (ex: RPC pública chamada 2x pelo cliente).
create table public.crm_domain_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}',
  processed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);
create index crm_domain_events_org_type_idx on public.crm_domain_events(org_id, event_type, created_at desc);
create index crm_domain_events_unprocessed_idx on public.crm_domain_events(created_at) where processed_at is null and failed_at is null;

-- Service-role only (mesmo padrão de notification_log/whatsapp_webhook_events)
-- — é infraestrutura interna, não dado que o app deva listar pro usuário.
alter table public.crm_domain_events enable row level security;

-- Dedupe de lembretes automáticos por EVENTO (não por dia, como
-- daily_push) — uma visita específica só recebe cada lembrete uma vez,
-- mesmo que o cron rode várias vezes dentro da janela. entity_id é
-- nullable pra não quebrar as linhas antigas de dedupe diário
-- (user_id, kind, sent_for_date), que continuam funcionando do jeito que
-- já funcionavam.
alter table public.notification_log
  add column if not exists entity_id uuid,
  alter column sent_for_date drop not null;

create unique index notification_log_entity_kind_unique
  on public.notification_log(entity_id, kind) where entity_id is not null;

alter table public.notification_log drop constraint if exists notification_log_kind_check;
alter table public.notification_log add constraint notification_log_kind_check
  check (kind in (
    'daily_push', 'daily_summary_email', 'stalled_deal_email',
    'visit_reminder_24h_whatsapp', 'visit_reminder_2h_push'
  ));

alter table public.notification_preferences
  add column if not exists visit_reminders_enabled boolean not null default true;

alter table public.whatsapp_messages drop constraint if exists whatsapp_messages_sent_by_check;
alter table public.whatsapp_messages add constraint whatsapp_messages_sent_by_check
  check (sent_by in ('ai', 'human', 'contact', 'system'));

-- "Cliente clica 'quero visitar' -> cria solicitação de visita + tarefa
-- urgente" (RE-3xx): estende record_property_reaction (0059) — quando a
-- reação é quero_visitar E a vitrine está vinculada a um atendimento, cria
-- (ou atualiza, se já existir uma solicitação em aberto pro mesmo
-- imóvel+atendimento) uma linha em real_estate_visits com status
-- 'requested', mais uma tarefa urgente pro corretor responsável pelo
-- imóvel (assignee_id, com fallback pro criador). Registra o evento em
-- crm_domain_events e processa na hora (síncrono, sem fila de verdade).
-- Notificação push imediata fica de fora aqui de propósito — chamar um
-- webhook HTTP de dentro do Postgres exigiria pg_net (infra nova, fora do
-- que foi pedido); a tarefa urgente já aparece no app imediatamente, e o
-- cron de lembretes (2h antes) cobre o aviso por push quando a visita for
-- agendada de fato.
create or replace function public.record_property_reaction(
  p_token uuid,
  p_property_id uuid,
  p_reaction text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.real_estate_share_collections%rowtype;
  v_status text;
  v_property public.real_estate_properties%rowtype;
  v_visit_id uuid;
  v_task_assignee uuid;
begin
  if p_reaction not in ('interessado','sem_interesse','quero_visitar') then
    raise exception 'Reação inválida.';
  end if;

  select * into link
  from public.real_estate_share_collections
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;
  if not found then
    raise exception 'Link inválido ou expirado.';
  end if;

  if not exists (
    select 1 from public.real_estate_share_collection_items i
    where i.collection_id = link.id and i.property_id = p_property_id
  ) then
    raise exception 'Imóvel não faz parte desta seleção.';
  end if;

  insert into public.real_estate_property_reactions (org_id, collection_id, property_id, reaction)
  values (link.org_id, link.id, p_property_id, p_reaction)
  on conflict (collection_id, property_id)
  do update set reaction = excluded.reaction, updated_at = now();

  if link.deal_id is not null then
    v_status := case when p_reaction = 'sem_interesse' then 'rejected' else 'interested' end;
    insert into public.real_estate_deal_properties (org_id, deal_id, property_id, status, reaction, source, viewed_at)
    values (link.org_id, link.deal_id, p_property_id, v_status, p_reaction, 'share_collection', now())
    on conflict (deal_id, property_id) do update
    set status = excluded.status, reaction = excluded.reaction, viewed_at = coalesce(real_estate_deal_properties.viewed_at, now())
    where real_estate_deal_properties.status in ('suggested', 'selected', 'sent', 'viewed');

    -- real_estate_visits.contact_id é not null — sem client_contact_id na
    -- vitrine (link genérico, nunca vinculado a um cliente específico) não
    -- dá pra atribuir a solicitação a ninguém; a reação acima já foi
    -- gravada normalmente, só a criação da visita/tarefa é pulada aqui.
    if p_reaction = 'quero_visitar' and link.client_contact_id is not null then
      select * into v_property from public.real_estate_properties where id = p_property_id;
      v_task_assignee := coalesce(v_property.assignee_id, v_property.created_by);

      select id into v_visit_id from public.real_estate_visits
      where deal_id = link.deal_id and property_id = p_property_id and status = 'requested'
      limit 1;

      if v_visit_id is null then
        insert into public.real_estate_visits (org_id, contact_id, deal_id, property_id, broker_id, status)
        values (link.org_id, link.client_contact_id, link.deal_id, p_property_id, v_task_assignee, 'requested')
        returning id into v_visit_id;

        insert into public.tasks (owner_id, org_id, workspace_key, assignee_id, deal_id, title, due_at)
        values (
          v_task_assignee, link.org_id, 'real_estate_broker', v_task_assignee, link.deal_id,
          'Cliente quer visitar: ' || v_property.title, now()
        );

        insert into public.crm_domain_events (org_id, event_type, aggregate_type, aggregate_id, idempotency_key, payload, processed_at)
        values (
          link.org_id, 'visit_requested', 'real_estate_visit', v_visit_id,
          'visit_requested:' || v_visit_id::text,
          jsonb_build_object('property_id', p_property_id, 'deal_id', link.deal_id, 'via', 'share_collection'),
          now()
        )
        on conflict (idempotency_key) do nothing;
      end if;
    end if;
  end if;
end;
$$;
