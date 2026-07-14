-- Vertical imobiliário, parte 6: dados de captação/proprietário do imóvel.
-- Fase 0 do plano de evolução do CRM imobiliário (RE-001) — só schema, sem
-- mudar comportamento de quem já usa o produto: toda coluna é nullable (ou
-- tem default que preserva o comportamento atual pra linhas existentes),
-- nenhuma política de RLS nova é necessária (real_estate_properties já tem
-- RLS por linha via can_view_realestate/can_manage_realestate — Postgres
-- RLS é por linha, não por coluna, então as políticas de 0052 já cobrem as
-- colunas novas automaticamente; ver test/integration/rls.test.ts).
--
-- Reversível: nenhuma dessas colunas é referenciada por código ainda não
-- commitado nem por outra migration. Rollback = rodar isto numa migration
-- nova (nunca editar uma já aplicada):
--   alter table public.real_estate_properties
--     drop column if exists owner_contact_id,
--     drop column if exists captured_by,
--     drop column if exists capture_source,
--     drop column if exists exclusive_listing,
--     drop column if exists exclusive_until,
--     drop column if exists commission_percent,
--     drop column if exists registration_number,
--     drop column if exists occupancy_status,
--     drop column if exists key_location,
--     drop column if exists listing_quality_score;

alter table public.real_estate_properties
  -- Proprietário do imóvel. FK composta com contacts(org_id, id) — mesmo
  -- padrão de real_estate_share_collections.client_contact_id (0054) —
  -- garante que não dá pra vincular um contato de outra organização nem
  -- por engano nem por um insert/update forjado (ver teste de FK composta
  -- em rls.test.ts). on delete set null (não cascade): apagar o contato
  -- não deve apagar o imóvel, só desvincular.
  add column if not exists owner_contact_id uuid,
  -- Quem captou o imóvel (trouxe a carteira pra dentro do CRM) — distinto
  -- de created_by (quem literalmente apertou "salvar", poderia ser um
  -- assistente/admin cadastrando em nome de outra pessoa) e de assignee_id
  -- (quem toca o imóvel agora, pode mudar com o tempo).
  add column if not exists captured_by uuid references auth.users(id) on delete set null,
  -- Origem da captação (ex: "Indicação", "Prospecção ativa", "Portal") —
  -- texto livre, mesmo padrão não-enumerado de contacts.source (0001),
  -- porque o vocabulário varia demais por corretora pra travar em check.
  add column if not exists capture_source text,
  add column if not exists exclusive_listing boolean not null default false,
  -- Só faz sentido quando exclusive_listing=true, mas não força isso via
  -- check: a UI decide quando exibir/exigir, o banco só guarda a data.
  add column if not exists exclusive_until timestamptz,
  add column if not exists commission_percent numeric(5,2)
    check (commission_percent >= 0 and commission_percent <= 100),
  -- Matrícula do imóvel no cartório de registro de imóveis.
  add column if not exists registration_number text,
  -- Texto livre por ora (mesmo motivo de capture_source) — igual
  -- key_location, o vocabulário exato ainda não foi definido pelo negócio;
  -- fica pra uma fase seguinte travar isso num check quando o vocabulário
  -- estiver fechado.
  add column if not exists occupancy_status text,
  add column if not exists key_location text,
  add column if not exists listing_quality_score integer
    check (listing_quality_score >= 0 and listing_quality_score <= 100);

alter table public.real_estate_properties
  add constraint real_estate_properties_org_owner_contact_fkey
  foreign key (org_id, owner_contact_id) references public.contacts(org_id, id) on delete set null;

create index if not exists real_estate_properties_owner_contact_idx
  on public.real_estate_properties(owner_contact_id);
create index if not exists real_estate_properties_captured_by_idx
  on public.real_estate_properties(captured_by);
