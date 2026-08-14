-- Rollback seguro: reverter a leitura/UI e manter estas tabelas e colunas.
-- Remoção física exige uma migration posterior explícita para não apagar
-- histórico, custos e motivos capturados depois do lançamento.

alter table public.deals
  add column loss_reason_code text,
  add column loss_reason_notes text,
  add constraint deals_loss_reason_code_check check (
    loss_reason_code is null or loss_reason_code in
    ('price', 'competitor', 'no_response', 'timing', 'profile_mismatch', 'other')
  );

-- 0072 converteu UPDATE de deals em allowlist por coluna. As colunas criadas
-- depois dela precisam entrar explicitamente para o fluxo jurídico da Task 6.
grant update (loss_reason_code, loss_reason_notes) on public.deals to authenticated;

-- Organização e workspace são identidade do registro, não campos operacionais.
-- Impedir sua troca pelo cliente fecha a evasão que combinava mudança de etapa
-- com saída do workspace jurídico (ou transferência para outro tenant).
revoke update (org_id, workspace_key) on public.deals from authenticated;

create table public.deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null check (workspace_key = 'law_office'),
  deal_id uuid not null references public.deals(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  from_stage text check (
    from_stage is null or from_stage in ('novo', 'em_contato', 'negociacao', 'ganho', 'perdido')
  ),
  to_stage text not null check (
    to_stage in ('novo', 'em_contato', 'negociacao', 'ganho', 'perdido')
  ),
  actor_id uuid references auth.users(id) on delete set null,
  is_baseline boolean not null default false,
  occurred_at timestamptz not null default now()
);

create index deal_stage_history_org_workspace_occurred_idx
  on public.deal_stage_history (org_id, workspace_key, occurred_at);
create index deal_stage_history_deal_occurred_idx
  on public.deal_stage_history (deal_id, occurred_at);

alter table public.deal_stage_history enable row level security;
create policy "deal_stage_history_select_member" on public.deal_stage_history
  for select using (
    workspace_key = 'law_office'
    and public.is_org_member(org_id)
  );

-- Membros autenticados só leem. A ausência deliberada de policies e grants
-- INSERT/UPDATE/DELETE torna o histórico imutável pela API do produto.
grant select on public.deal_stage_history to authenticated;
grant all privileges on public.deal_stage_history to service_role;

create or replace function public.capture_legal_deal_stage_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if new.workspace_key <> 'law_office' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.stage is not distinct from old.stage then
    return new;
  end if;

  if v_actor_id is not null and not public.is_org_member(new.org_id) then
    v_actor_id := null;
  end if;

  insert into public.deal_stage_history (
    org_id,
    workspace_key,
    deal_id,
    contact_id,
    from_stage,
    to_stage,
    actor_id,
    is_baseline,
    occurred_at
  )
  values (
    new.org_id,
    'law_office',
    new.id,
    new.contact_id,
    case when tg_op = 'UPDATE' then old.stage::text else null end,
    new.stage::text,
    v_actor_id,
    false,
    pg_catalog.now()
  );

  return new;
end;
$$;

revoke all on function public.capture_legal_deal_stage_history()
  from public, anon, authenticated;
grant execute on function public.capture_legal_deal_stage_history() to service_role;

create trigger deals_capture_legal_stage_history
  after insert or update of stage on public.deals
  for each row execute function public.capture_legal_deal_stage_history();

-- Não inventa transições anteriores: cada negócio jurídico existente
-- recebe somente um retrato da etapa atual, marcado como baseline.
insert into public.deal_stage_history (
  org_id,
  workspace_key,
  deal_id,
  contact_id,
  from_stage,
  to_stage,
  actor_id,
  is_baseline,
  occurred_at
)
select
  public.deals.org_id,
  'law_office',
  public.deals.id,
  public.deals.contact_id,
  null,
  public.deals.stage::text,
  null,
  true,
  pg_catalog.transaction_timestamp()
from public.deals
where public.deals.workspace_key = 'law_office'
order by public.deals.id;

-- A mensagem e sua conversa precisam pertencer à mesma organização. As FKs
-- independentes anteriores permitiam associar org A a uma conversa da org B.
alter table public.whatsapp_conversations
  add constraint whatsapp_conversations_org_id_id_unique unique (org_id, id);

alter table public.whatsapp_messages
  drop constraint whatsapp_messages_conversation_id_fkey,
  add constraint whatsapp_messages_org_conversation_fkey
    foreign key (org_id, conversation_id)
    references public.whatsapp_conversations(org_id, id)
    on delete cascade;

alter table public.whatsapp_conversations
  add column first_inbound_at timestamptz,
  add column first_response_at timestamptz,
  add column first_response_sent_by text,
  add constraint whatsapp_conversations_first_response_sender_check check (
    first_response_sent_by is null or first_response_sent_by in ('ai', 'human')
  ),
  add constraint whatsapp_conversations_first_response_pair_check check (
    (first_response_at is null and first_response_sent_by is null)
    or (first_response_at is not null and first_response_sent_by is not null)
  ),
  add constraint whatsapp_conversations_first_response_order_check check (
    first_response_at is null
    or (first_inbound_at is not null and first_response_at >= first_inbound_at)
  );

-- Os marcadores são derivados das mensagens e não podem ser forjados por
-- um membro. Recria as allowlists de INSERT e UPDATE sem essas três colunas.
revoke insert, update on public.whatsapp_conversations from authenticated;
do $$
declare
  allowed_insert_columns text;
  allowed_update_columns text;
begin
  select pg_catalog.string_agg(
      pg_catalog.format('%I', information_schema.columns.column_name),
      ', ' order by information_schema.columns.ordinal_position
    )
    into allowed_insert_columns
  from information_schema.columns
  where information_schema.columns.table_schema = 'public'
    and information_schema.columns.table_name = 'whatsapp_conversations'
    and information_schema.columns.column_name not in (
      'first_inbound_at',
      'first_response_at',
      'first_response_sent_by'
    );

  select pg_catalog.string_agg(
      pg_catalog.format('%I', information_schema.columns.column_name),
      ', ' order by information_schema.columns.ordinal_position
    )
    into allowed_update_columns
  from information_schema.columns
  where information_schema.columns.table_schema = 'public'
    and information_schema.columns.table_name = 'whatsapp_conversations'
    and information_schema.columns.column_name not in (
      'id',
      'org_id',
      'first_inbound_at',
      'first_response_at',
      'first_response_sent_by'
    );

  execute pg_catalog.format(
    'grant insert (%s) on public.whatsapp_conversations to authenticated',
    allowed_insert_columns
  );
  execute pg_catalog.format(
    'grant update (%s) on public.whatsapp_conversations to authenticated',
    allowed_update_columns
  );
end;
$$;

create or replace function public.recalculate_whatsapp_response_markers(
  p_org_id uuid,
  p_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_inbound_id uuid;
  v_first_inbound_at timestamptz;
  v_first_response_at timestamptz;
  v_first_response_sent_by text;
begin
  -- O lock vem antes de qualquer leitura. Em READ COMMITTED, uma chamada que
  -- aguardou outra transação lê um snapshot novo depois que recebe o lock.
  perform 1
  from public.whatsapp_conversations
  where public.whatsapp_conversations.org_id = p_org_id
    and public.whatsapp_conversations.id = p_conversation_id
  for update;

  if not found then
    return;
  end if;

  select public.whatsapp_messages.id, public.whatsapp_messages.created_at
    into v_first_inbound_id, v_first_inbound_at
  from public.whatsapp_messages
  where public.whatsapp_messages.org_id = p_org_id
    and public.whatsapp_messages.conversation_id = p_conversation_id
    and public.whatsapp_messages.direction = 'inbound'
  order by public.whatsapp_messages.created_at, public.whatsapp_messages.id
  limit 1;

  if v_first_inbound_id is not null then
    select public.whatsapp_messages.created_at, public.whatsapp_messages.sent_by
      into v_first_response_at, v_first_response_sent_by
    from public.whatsapp_messages
    where public.whatsapp_messages.org_id = p_org_id
      and public.whatsapp_messages.conversation_id = p_conversation_id
      and public.whatsapp_messages.direction = 'outbound'
      and public.whatsapp_messages.sent_by in ('ai', 'human')
      and (
        public.whatsapp_messages.created_at,
        public.whatsapp_messages.id
      ) > (
        v_first_inbound_at,
        v_first_inbound_id
      )
    order by public.whatsapp_messages.created_at, public.whatsapp_messages.id
    limit 1;
  end if;

  update public.whatsapp_conversations
  set
    first_inbound_at = v_first_inbound_at,
    first_response_at = v_first_response_at,
    first_response_sent_by = v_first_response_sent_by
  where public.whatsapp_conversations.org_id = p_org_id
    and public.whatsapp_conversations.id = p_conversation_id;
end;
$$;

revoke all on function public.recalculate_whatsapp_response_markers(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.recalculate_whatsapp_response_markers(uuid, uuid) to service_role;

create or replace function public.refresh_whatsapp_response_markers_from_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_whatsapp_response_markers(old.org_id, old.conversation_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and (old.org_id, old.conversation_id)
      is distinct from (new.org_id, new.conversation_id) then
    perform public.recalculate_whatsapp_response_markers(old.org_id, old.conversation_id);
  end if;

  perform public.recalculate_whatsapp_response_markers(new.org_id, new.conversation_id);
  return new;
end;
$$;

revoke all on function public.refresh_whatsapp_response_markers_from_message()
  from public, anon, authenticated;
grant execute on function public.refresh_whatsapp_response_markers_from_message() to service_role;

create trigger whatsapp_messages_refresh_response_markers
  after insert or update or delete on public.whatsapp_messages
  for each row execute function public.refresh_whatsapp_response_markers_from_message();

-- Backfill determinístico por (created_at, id). Outbound `system` fica fora;
-- a resposta precisa estar ordenada depois da primeira mensagem inbound.
with first_inbound as (
  select distinct on (public.whatsapp_messages.org_id, public.whatsapp_messages.conversation_id)
    public.whatsapp_messages.org_id,
    public.whatsapp_messages.conversation_id,
    public.whatsapp_messages.id,
    public.whatsapp_messages.created_at
  from public.whatsapp_messages
  where public.whatsapp_messages.direction = 'inbound'
  order by
    public.whatsapp_messages.org_id,
    public.whatsapp_messages.conversation_id,
    public.whatsapp_messages.created_at,
    public.whatsapp_messages.id
),
first_response as (
  select distinct on (public.whatsapp_messages.org_id, public.whatsapp_messages.conversation_id)
    public.whatsapp_messages.org_id,
    public.whatsapp_messages.conversation_id,
    public.whatsapp_messages.created_at,
    public.whatsapp_messages.sent_by
  from public.whatsapp_messages
  join first_inbound
    on first_inbound.org_id = public.whatsapp_messages.org_id
    and first_inbound.conversation_id = public.whatsapp_messages.conversation_id
  where public.whatsapp_messages.direction = 'outbound'
    and public.whatsapp_messages.sent_by in ('ai', 'human')
    and (
      public.whatsapp_messages.created_at,
      public.whatsapp_messages.id
    ) > (
      first_inbound.created_at,
      first_inbound.id
    )
  order by
    public.whatsapp_messages.org_id,
    public.whatsapp_messages.conversation_id,
    public.whatsapp_messages.created_at,
    public.whatsapp_messages.id
)
update public.whatsapp_conversations
set
  first_inbound_at = first_inbound.created_at,
  first_response_at = first_response.created_at,
  first_response_sent_by = first_response.sent_by
from first_inbound
left join first_response
  on first_response.org_id = first_inbound.org_id
  and first_response.conversation_id = first_inbound.conversation_id
where public.whatsapp_conversations.org_id = first_inbound.org_id
  and public.whatsapp_conversations.id = first_inbound.conversation_id;

create table public.law_acquisition_costs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'law_office' check (workspace_key = 'law_office'),
  month date not null check (month = pg_catalog.date_trunc('month', month)::date),
  marketing_cents integer not null default 0 check (marketing_cents >= 0),
  commercial_cents integer not null default 0 check (commercial_cents >= 0),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, workspace_key, month)
);

create index law_acquisition_costs_org_month_idx
  on public.law_acquisition_costs (org_id, month);

create or replace function public.stamp_law_acquisition_cost_actors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
  end if;

  -- service_role não possui auth.uid(): nesse caminho explícito os atores
  -- fornecidos pelo servidor são preservados, exceto created_by em updates.
  if v_actor_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := v_actor_id;
  end if;
  new.updated_by := v_actor_id;
  return new;
end;
$$;

revoke all on function public.stamp_law_acquisition_cost_actors()
  from public, anon, authenticated;
grant execute on function public.stamp_law_acquisition_cost_actors() to service_role;

create trigger law_acquisition_costs_stamp_actors
  before insert or update on public.law_acquisition_costs
  for each row execute function public.stamp_law_acquisition_cost_actors();

create trigger law_acquisition_costs_touch
  before update on public.law_acquisition_costs
  for each row execute function public.touch_law_office_record();

revoke all on function public.touch_law_office_record()
  from public, anon, authenticated;

alter table public.law_acquisition_costs enable row level security;
create policy "law_acquisition_costs_select" on public.law_acquisition_costs
  for select using (
    workspace_key = 'law_office'
    and public.can_view_finance(org_id)
  );
create policy "law_acquisition_costs_write" on public.law_acquisition_costs
  for all using (
    workspace_key = 'law_office'
    and public.can_manage_finance(org_id)
  ) with check (
    workspace_key = 'law_office'
    and public.can_manage_finance(org_id)
  );

grant select, insert, update, delete on public.law_acquisition_costs to authenticated;
grant all privileges on public.law_acquisition_costs to service_role;
