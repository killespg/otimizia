-- Vertical de venda de produtos: configuração modular, catálogo, coleções,
-- estoque, pedidos e pós-venda. A negociação (deals) continua sendo o funil;
-- seller_orders passa a ser o registro operacional imutável do fechamento.

create or replace function public.touch_seller_record()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.seller_business_profiles (
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'autonomous_seller' check (workspace_key = 'autonomous_seller'),
  sales_models text[] not null default array['general']::text[],
  enabled_modules text[] not null default array['catalog','orders']::text[],
  default_warranty_days integer not null default 0 check (default_warranty_days between 0 and 3650),
  low_stock_threshold integer not null default 3 check (low_stock_threshold between 0 and 1000000),
  allow_negative_stock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, workspace_key),
  check (sales_models <@ array['general','fashion','durable','consumable','made_to_order','commercial_representative']::text[]),
  check (enabled_modules <@ array['catalog','collections','variants','inventory','orders','warranties','consumables','made_to_order','commissions','delivery']::text[])
);
create trigger seller_business_profiles_touch before update on public.seller_business_profiles
  for each row execute function public.touch_seller_record();

create table public.seller_collections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'autonomous_seller' check (workspace_key = 'autonomous_seller'),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  starts_on date,
  ends_on date,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index seller_collections_org_status_idx on public.seller_collections(org_id, status, starts_on desc);
create trigger seller_collections_touch before update on public.seller_collections
  for each row execute function public.touch_seller_record();

create table public.seller_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'autonomous_seller' check (workspace_key = 'autonomous_seller'),
  collection_id uuid,
  name text not null check (char_length(name) between 1 and 160),
  sku text,
  category text,
  brand text,
  kind text not null default 'general' check (kind in ('general','fashion','durable','consumable','made_to_order','commercial_representative')),
  status text not null default 'active' check (status in ('draft','active','inactive')),
  description text,
  base_price_cents bigint not null default 0 check (base_price_cents >= 0),
  cost_cents bigint check (cost_cents is null or cost_cents >= 0),
  track_stock boolean not null default true,
  stock_quantity integer not null default 0,
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer check (low_stock_threshold is null or low_stock_threshold >= 0),
  warranty_days integer not null default 0 check (warranty_days between 0 and 3650),
  requires_serial boolean not null default false,
  reorder_interval_days integer check (reorder_interval_days is null or reorder_interval_days between 1 and 3650),
  default_lead_time_days integer check (default_lead_time_days is null or default_lead_time_days between 1 and 3650),
  default_commission_percent numeric(5,2) check (default_commission_percent is null or default_commission_percent between 0 and 100),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, collection_id) references public.seller_collections(org_id, id) on delete set null
);
create unique index seller_products_org_sku_unique on public.seller_products(org_id, lower(sku)) where sku is not null;
create index seller_products_org_status_idx on public.seller_products(org_id, status, updated_at desc);
create index seller_products_collection_idx on public.seller_products(collection_id);
create trigger seller_products_touch before update on public.seller_products
  for each row execute function public.touch_seller_record();

create table public.seller_product_variants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  sku text,
  attributes jsonb not null default '{}'::jsonb,
  price_cents bigint check (price_cents is null or price_cents >= 0),
  stock_quantity integer not null default 0,
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, product_id) references public.seller_products(org_id, id) on delete cascade
);
create unique index seller_variants_org_sku_unique on public.seller_product_variants(org_id, lower(sku)) where sku is not null;
create index seller_variants_product_idx on public.seller_product_variants(product_id, active);
create trigger seller_product_variants_touch before update on public.seller_product_variants
  for each row execute function public.touch_seller_record();

create table public.seller_product_media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  storage_path text not null unique,
  alt_text text,
  position integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (org_id, product_id) references public.seller_products(org_id, id) on delete cascade
);
create index seller_product_media_product_idx on public.seller_product_media(product_id, position);

create table public.seller_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  order_id uuid,
  movement_type text not null check (movement_type in ('initial','sale','adjustment','return','reservation','reservation_release')),
  quantity_delta integer not null check (quantity_delta <> 0),
  balance_after integer not null,
  reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (org_id, product_id) references public.seller_products(org_id, id) on delete cascade,
  foreign key (org_id, variant_id) references public.seller_product_variants(org_id, id) on delete set null
);
create index seller_inventory_product_idx on public.seller_inventory_movements(product_id, created_at desc);

create table public.seller_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'autonomous_seller' check (workspace_key = 'autonomous_seller'),
  deal_id uuid,
  contact_id uuid,
  order_number text not null,
  status text not null default 'draft' check (status in ('draft','confirmed','preparing','ready','delivered','completed','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','partial','paid','refunded')),
  payment_method text check (payment_method is null or payment_method in ('cash','pix','card','installments','bank_transfer','payment_link','other')),
  delivery_method text check (delivery_method is null or delivery_method in ('pickup','local_delivery','carrier','customer_address','digital','other')),
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  notes text,
  confirmed_at timestamptz,
  delivered_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, order_number),
  unique (deal_id),
  foreign key (org_id, deal_id) references public.deals(org_id, id) on delete set null,
  foreign key (org_id, contact_id) references public.contacts(org_id, id) on delete set null
);
create index seller_orders_org_status_idx on public.seller_orders(org_id, status, created_at desc);
create index seller_orders_contact_idx on public.seller_orders(contact_id, created_at desc);
create trigger seller_orders_touch before update on public.seller_orders
  for each row execute function public.touch_seller_record();

alter table public.seller_inventory_movements
  add constraint seller_inventory_order_fk foreign key (org_id, order_id)
  references public.seller_orders(org_id, id) on delete set null;

create table public.seller_order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null,
  product_id uuid,
  variant_id uuid,
  product_name_snapshot text not null,
  sku_snapshot text,
  variant_snapshot text,
  collection_name_snapshot text,
  quantity integer not null check (quantity between 1 and 100000),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  warranty_days_snapshot integer not null default 0 check (warranty_days_snapshot between 0 and 3650),
  serial_number text,
  customization_notes text,
  promised_on date,
  reorder_due_on date,
  commission_percent numeric(5,2) not null default 0 check (commission_percent between 0 and 100),
  commission_cents bigint not null default 0 check (commission_cents >= 0),
  line_total_cents bigint generated always as (greatest(0, quantity * unit_price_cents - discount_cents)) stored,
  created_at timestamptz not null default now(),
  foreign key (org_id, order_id) references public.seller_orders(org_id, id) on delete cascade,
  foreign key (org_id, product_id) references public.seller_products(org_id, id) on delete set null,
  foreign key (org_id, variant_id) references public.seller_product_variants(org_id, id) on delete set null
);
create index seller_order_items_order_idx on public.seller_order_items(order_id);
create index seller_order_items_product_idx on public.seller_order_items(product_id, created_at desc);

create table public.seller_warranties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_item_id uuid not null unique references public.seller_order_items(id) on delete cascade,
  contact_id uuid,
  product_id uuid,
  serial_number text,
  starts_on date not null,
  expires_on date not null check (expires_on >= starts_on),
  status text not null default 'active' check (status in ('active','void')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, contact_id) references public.contacts(org_id, id) on delete set null,
  foreign key (org_id, product_id) references public.seller_products(org_id, id) on delete set null
);
create index seller_warranties_org_expiry_idx on public.seller_warranties(org_id, status, expires_on);
create trigger seller_warranties_touch before update on public.seller_warranties
  for each row execute function public.touch_seller_record();

create table public.seller_warranty_claims (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  warranty_id uuid not null references public.seller_warranties(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  issue_description text not null check (char_length(issue_description) between 1 and 4000),
  status text not null default 'open' check (status in ('open','analysis','assistance','replacement_approved','refund_approved','resolved','cancelled')),
  resolution text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seller_claims_org_status_idx on public.seller_warranty_claims(org_id, status, opened_at desc);
create trigger seller_warranty_claims_touch before update on public.seller_warranty_claims
  for each row execute function public.touch_seller_record();

create table public.seller_customer_profiles (
  org_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  clothing_sizes jsonb not null default '{}'::jsonb,
  measurements jsonb not null default '{}'::jsonb,
  preferred_colors text[] not null default '{}'::text[],
  style_notes text,
  shoe_size numeric(4,1),
  reorder_interval_days integer check (reorder_interval_days is null or reorder_interval_days between 1 and 3650),
  updated_at timestamptz not null default now(),
  primary key (org_id, contact_id),
  foreign key (org_id, contact_id) references public.contacts(org_id, id) on delete cascade
);
create trigger seller_customer_profiles_touch before update on public.seller_customer_profiles
  for each row execute function public.touch_seller_record();

-- RLS: configuração estrutural é administrada pelo dono; operação diária é
-- compartilhada pela equipe da organização, sempre isolada por org_id.
alter table public.seller_business_profiles enable row level security;
create policy "seller_profiles_select_member" on public.seller_business_profiles
  for select using (public.is_org_member(org_id));
create policy "seller_profiles_write_admin" on public.seller_business_profiles
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'seller_collections','seller_products','seller_product_variants','seller_product_media',
    'seller_inventory_movements','seller_orders','seller_order_items','seller_warranties',
    'seller_warranty_claims','seller_customer_profiles'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id))',
      table_name || '_member', table_name
    );
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-product-images', 'seller-product-images', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "seller_product_images_select" on storage.objects for select to authenticated
using (bucket_id = 'seller-product-images' and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy "seller_product_images_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'seller-product-images' and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy "seller_product_images_update" on storage.objects for update to authenticated
using (bucket_id = 'seller-product-images' and public.is_org_member(((storage.foldername(name))[1])::uuid))
with check (bucket_id = 'seller-product-images' and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy "seller_product_images_delete" on storage.objects for delete to authenticated
using (bucket_id = 'seller-product-images' and public.is_org_member(((storage.foldername(name))[1])::uuid));

-- Troca de coleção em uma única transação: não existe estado intermediário
-- com a coleção nova criada e a antiga ainda ativa.
create or replace function public.switch_seller_collection(
  p_org_id uuid,
  p_name text,
  p_starts_on date default null,
  p_ends_on date default null,
  p_description text default null,
  p_previous_collection_id uuid default null,
  p_product_ids uuid[] default '{}'::uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_id uuid;
begin
  if not public.is_org_member(p_org_id) then raise exception 'not authorized'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then raise exception 'Informe o nome da coleção.'; end if;
  if p_ends_on is not null and p_starts_on is not null and p_ends_on < p_starts_on then
    raise exception 'A data final deve ser posterior à inicial.';
  end if;
  if p_previous_collection_id is not null then
    perform 1 from public.seller_collections
    where id = p_previous_collection_id and org_id = p_org_id for update;
    if not found then raise exception 'Coleção atual não encontrada.'; end if;
  end if;

  insert into public.seller_collections (
    org_id, workspace_key, name, status, starts_on, ends_on, description, created_by
  ) values (
    p_org_id, 'autonomous_seller', left(trim(p_name), 120), 'active', p_starts_on,
    p_ends_on, nullif(left(trim(coalesce(p_description, '')), 1000), ''), auth.uid()
  ) returning id into v_next_id;

  if p_previous_collection_id is not null then
    update public.seller_collections set status = 'archived'
    where id = p_previous_collection_id and org_id = p_org_id;
  end if;

  if coalesce(array_length(p_product_ids, 1), 0) > 0 then
    update public.seller_products set collection_id = v_next_id
    where org_id = p_org_id
      and id = any(p_product_ids)
      and (p_previous_collection_id is null or collection_id = p_previous_collection_id);
  end if;
  return v_next_id;
end;
$$;

revoke all on function public.switch_seller_collection(uuid, text, date, date, text, uuid, uuid[]) from public;
grant execute on function public.switch_seller_collection(uuid, text, date, date, text, uuid, uuid[]) to authenticated;

-- Ajuste com bloqueio de linha para impedir perda de saldo quando duas pessoas
-- movimentam o mesmo produto ao mesmo tempo.
create or replace function public.adjust_seller_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_quantity_delta integer,
  p_reason text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.seller_products%rowtype;
  v_variant public.seller_product_variants%rowtype;
  v_allow_negative boolean := false;
  v_balance integer;
  v_reserved integer;
begin
  if p_quantity_delta = 0 then raise exception 'A quantidade deve ser diferente de zero.'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 1 then raise exception 'Informe o motivo do ajuste.'; end if;

  select * into v_product from public.seller_products where id = p_product_id for update;
  if not found or not public.is_org_member(v_product.org_id) then raise exception 'Produto não encontrado.'; end if;
  select allow_negative_stock into v_allow_negative from public.seller_business_profiles
  where org_id = v_product.org_id and workspace_key = 'autonomous_seller';
  v_allow_negative := coalesce(v_allow_negative, false);

  if p_variant_id is not null then
    select * into v_variant from public.seller_product_variants
    where id = p_variant_id and product_id = p_product_id and org_id = v_product.org_id for update;
    if not found then raise exception 'Variação não encontrada.'; end if;
    v_balance := v_variant.stock_quantity + p_quantity_delta;
    v_reserved := v_variant.reserved_quantity;
    if v_balance - v_reserved < 0 and not v_allow_negative then raise exception 'O ajuste deixaria o estoque disponível negativo.'; end if;
    update public.seller_product_variants set stock_quantity = v_balance where id = p_variant_id;
  else
    v_balance := v_product.stock_quantity + p_quantity_delta;
    v_reserved := v_product.reserved_quantity;
    if v_balance - v_reserved < 0 and not v_allow_negative then raise exception 'O ajuste deixaria o estoque disponível negativo.'; end if;
    update public.seller_products set stock_quantity = v_balance where id = p_product_id;
  end if;

  insert into public.seller_inventory_movements (
    org_id, product_id, variant_id, movement_type, quantity_delta, balance_after, reason, created_by
  ) values (
    v_product.org_id, p_product_id, p_variant_id, 'adjustment', p_quantity_delta,
    v_balance, left(trim(p_reason), 240), auth.uid()
  );
  return v_balance;
end;
$$;

revoke all on function public.adjust_seller_stock(uuid, uuid, integer, text) from public;
grant execute on function public.adjust_seller_stock(uuid, uuid, integer, text) to authenticated;

-- Confirma uma negociação e cria o pedido inteiro numa única transação. O JSON
-- aceita produto existente ou quick_product, permitindo cadastrar o item sem
-- sair da confirmação da venda.
create or replace function public.confirm_seller_sale(
  p_deal_id uuid,
  p_items jsonb,
  p_payment_method text default null,
  p_delivery_method text default null,
  p_discount_cents bigint default 0,
  p_shipping_cents bigint default 0,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal public.deals%rowtype;
  v_order_id uuid;
  v_order_item_id uuid;
  v_item jsonb;
  v_quick jsonb;
  v_product public.seller_products%rowtype;
  v_variant public.seller_product_variants%rowtype;
  v_product_id uuid;
  v_variant_id uuid;
  v_collection_id uuid;
  v_collection_name text;
  v_quantity integer;
  v_unit_price bigint;
  v_line_discount bigint;
  v_warranty_days integer;
  v_subtotal bigint := 0;
  v_balance integer;
  v_allow_negative boolean := false;
  v_product_name text;
  v_sku text;
  v_variant_name text;
  v_customization_notes text;
  v_promised_on date;
  v_reorder_due_on date;
  v_commission_percent numeric(5,2);
  v_commission_cents bigint;
begin
  select * into v_deal from public.deals where id = p_deal_id for update;
  if not found or v_deal.workspace_key <> 'autonomous_seller' then
    raise exception 'Venda não encontrada.';
  end if;
  if not public.is_org_member(v_deal.org_id) then
    raise exception 'not authorized';
  end if;

  select id into v_order_id from public.seller_orders where deal_id = p_deal_id;
  if v_order_id is not null then return v_order_id; end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Adicione entre 1 e 100 itens à venda.';
  end if;
  if coalesce(p_discount_cents, 0) < 0 or coalesce(p_shipping_cents, 0) < 0 then
    raise exception 'Desconto ou frete inválido.';
  end if;
  if p_payment_method is not null and p_payment_method not in ('cash','pix','card','installments','bank_transfer','payment_link','other') then
    raise exception 'Forma de pagamento inválida.';
  end if;
  if p_delivery_method is not null and p_delivery_method not in ('pickup','local_delivery','carrier','customer_address','digital','other') then
    raise exception 'Forma de entrega inválida.';
  end if;

  select allow_negative_stock into v_allow_negative
  from public.seller_business_profiles
  where org_id = v_deal.org_id and workspace_key = 'autonomous_seller';
  v_allow_negative := coalesce(v_allow_negative, false);

  insert into public.seller_orders (
    org_id, workspace_key, deal_id, contact_id, order_number, status,
    payment_method, delivery_method, discount_cents, shipping_cents, notes,
    confirmed_at, created_by
  ) values (
    v_deal.org_id, 'autonomous_seller', v_deal.id, v_deal.contact_id,
    'VD-' || to_char(now(), 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    'confirmed', p_payment_method, p_delivery_method, coalesce(p_discount_cents, 0),
    coalesce(p_shipping_cents, 0), nullif(trim(p_notes), ''), now(), auth.uid()
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_collection_name := null;
    v_quantity := greatest(1, least(100000, coalesce((v_item->>'quantity')::integer, 1)));
    v_unit_price := greatest(0, coalesce((v_item->>'unit_price_cents')::bigint, 0));
    v_line_discount := greatest(0, coalesce((v_item->>'discount_cents')::bigint, 0));
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    v_quick := v_item->'quick_product';

    if v_product_id is null then
      if v_quick is null or jsonb_typeof(v_quick) <> 'object' or char_length(trim(coalesce(v_quick->>'name',''))) < 1 then
        raise exception 'Informe o produto.';
      end if;
      v_collection_id := nullif(v_quick->>'collection_id', '')::uuid;
      if v_collection_id is not null and not exists (
        select 1 from public.seller_collections where id = v_collection_id and org_id = v_deal.org_id
      ) then raise exception 'Coleção inválida.'; end if;

      insert into public.seller_products (
        org_id, workspace_key, collection_id, name, sku, category, brand, kind,
        base_price_cents, track_stock, stock_quantity, warranty_days,
        requires_serial, reorder_interval_days, default_lead_time_days,
        default_commission_percent, created_by
      ) values (
        v_deal.org_id, 'autonomous_seller', v_collection_id,
        left(trim(v_quick->>'name'), 160), nullif(left(trim(coalesce(v_quick->>'sku','')), 80), ''),
        nullif(left(trim(coalesce(v_quick->>'category','')), 80), ''),
        nullif(left(trim(coalesce(v_quick->>'brand','')), 120), ''),
        case when coalesce(v_quick->>'kind','general') in ('general','fashion','durable','consumable','made_to_order','commercial_representative')
          then coalesce(v_quick->>'kind','general') else 'general' end,
        v_unit_price, coalesce((v_quick->>'track_stock')::boolean, true),
        greatest(v_quantity, coalesce((v_quick->>'initial_stock')::integer, v_quantity)),
        greatest(0, least(3650, coalesce((v_quick->>'warranty_days')::integer, 0))),
        coalesce((v_quick->>'requires_serial')::boolean, false),
        nullif(v_quick->>'reorder_interval_days', '')::integer,
        nullif(v_quick->>'default_lead_time_days', '')::integer,
        nullif(v_quick->>'default_commission_percent', '')::numeric,
        auth.uid()
      ) returning * into v_product;
      v_product_id := v_product.id;

      v_variant_name := nullif(left(trim(coalesce(v_quick->>'variant_name','')), 120), '');
      if v_variant_name is not null then
        insert into public.seller_product_variants (
          org_id, product_id, name, sku, attributes, price_cents, stock_quantity
        ) values (
          v_deal.org_id, v_product_id, v_variant_name,
          nullif(left(trim(coalesce(v_quick->>'variant_sku','')), 80), ''),
          coalesce(v_quick->'variant_attributes', '{}'::jsonb), v_unit_price,
          greatest(v_quantity, coalesce((v_quick->>'initial_stock')::integer, v_quantity))
        ) returning * into v_variant;
        v_variant_id := v_variant.id;
      end if;
    else
      select * into v_product from public.seller_products
      where id = v_product_id and org_id = v_deal.org_id and status <> 'inactive' for update;
      if not found then raise exception 'Produto não encontrado.'; end if;
      if v_variant_id is not null then
        select * into v_variant from public.seller_product_variants
        where id = v_variant_id and product_id = v_product_id and org_id = v_deal.org_id and active for update;
        if not found then raise exception 'Variação não encontrada.'; end if;
      end if;
    end if;

    select name into v_collection_name from public.seller_collections
    where id = v_product.collection_id and org_id = v_deal.org_id;
    v_product_name := v_product.name;
    v_sku := case when v_variant_id is null then v_product.sku else coalesce(v_variant.sku, v_product.sku) end;
    v_variant_name := coalesce(nullif(v_item->>'variant_snapshot',''), case when v_variant_id is null then null else v_variant.name end);
    v_warranty_days := greatest(0, least(3650,
      coalesce((v_item->>'warranty_days')::integer, v_product.warranty_days, 0)));
    v_customization_notes := nullif(left(trim(coalesce(v_item->>'customization_notes', '')), 2000), '');
    v_promised_on := nullif(v_item->>'promised_on', '')::date;
    if v_promised_on is null and v_product.kind = 'made_to_order' and v_product.default_lead_time_days is not null then
      v_promised_on := current_date + v_product.default_lead_time_days;
    end if;
    v_reorder_due_on := nullif(v_item->>'reorder_due_on', '')::date;
    if v_reorder_due_on is null and v_product.kind = 'consumable' and v_product.reorder_interval_days is not null then
      v_reorder_due_on := current_date + v_product.reorder_interval_days;
    end if;
    v_commission_percent := greatest(0, least(100,
      coalesce(nullif(v_item->>'commission_percent', '')::numeric, v_product.default_commission_percent, 0)));
    v_commission_cents := round((greatest(0, v_quantity * v_unit_price - v_line_discount)::numeric * v_commission_percent) / 100)::bigint;

    if v_product.track_stock then
      if v_variant_id is not null then
        v_balance := v_variant.stock_quantity - v_quantity;
        if v_balance - v_variant.reserved_quantity < 0 and not v_allow_negative then raise exception 'Estoque insuficiente para %.', v_product.name; end if;
        update public.seller_product_variants set stock_quantity = v_balance where id = v_variant_id;
      else
        v_balance := v_product.stock_quantity - v_quantity;
        if v_balance - v_product.reserved_quantity < 0 and not v_allow_negative then raise exception 'Estoque insuficiente para %.', v_product.name; end if;
        update public.seller_products set stock_quantity = v_balance where id = v_product_id;
      end if;
      insert into public.seller_inventory_movements (
        org_id, product_id, variant_id, order_id, movement_type, quantity_delta,
        balance_after, reason, created_by
      ) values (
        v_deal.org_id, v_product_id, v_variant_id, v_order_id, 'sale', -v_quantity,
        v_balance, 'Venda ' || v_deal.title, auth.uid()
      );
    end if;

    insert into public.seller_order_items (
      org_id, order_id, product_id, variant_id, product_name_snapshot, sku_snapshot,
      variant_snapshot, collection_name_snapshot, quantity, unit_price_cents,
      discount_cents, warranty_days_snapshot, serial_number, customization_notes,
      promised_on, reorder_due_on, commission_percent, commission_cents
    ) values (
      v_deal.org_id, v_order_id, v_product_id, v_variant_id, v_product_name, v_sku,
      v_variant_name, v_collection_name, v_quantity, v_unit_price, v_line_discount,
      v_warranty_days, nullif(left(trim(coalesce(v_item->>'serial_number','')), 160), ''),
      v_customization_notes, v_promised_on, v_reorder_due_on,
      v_commission_percent, v_commission_cents
    ) returning id into v_order_item_id;

    if v_warranty_days > 0 then
      insert into public.seller_warranties (
        org_id, order_item_id, contact_id, product_id, serial_number, starts_on, expires_on
      ) values (
        v_deal.org_id, v_order_item_id, v_deal.contact_id, v_product_id,
        nullif(left(trim(coalesce(v_item->>'serial_number','')), 160), ''),
        current_date, current_date + v_warranty_days
      );
    end if;

    v_subtotal := v_subtotal + greatest(0, v_quantity * v_unit_price - v_line_discount);
  end loop;

  update public.seller_orders set
    subtotal_cents = v_subtotal,
    total_cents = greatest(0, v_subtotal - coalesce(p_discount_cents, 0) + coalesce(p_shipping_cents, 0))
  where id = v_order_id;

  update public.deals set
    stage = 'ganho',
    closed_at = now(),
    value_cents = greatest(0, v_subtotal - coalesce(p_discount_cents, 0) + coalesce(p_shipping_cents, 0)),
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object('seller_order_id', v_order_id::text, 'pipeline_list', 'Ganho')
  where id = v_deal.id;

  insert into public.crm_domain_events (
    org_id, event_type, aggregate_type, aggregate_id, idempotency_key, payload, processed_at
  ) values (
    v_deal.org_id, 'seller_order_confirmed', 'seller_order', v_order_id,
    'seller_order_confirmed:' || v_order_id::text,
    jsonb_build_object('deal_id', v_deal.id, 'contact_id', v_deal.contact_id, 'total_cents', greatest(0, v_subtotal - coalesce(p_discount_cents, 0) + coalesce(p_shipping_cents, 0))),
    now()
  ) on conflict (idempotency_key) do nothing;

  return v_order_id;
end;
$$;

revoke all on function public.confirm_seller_sale(uuid, jsonb, text, text, bigint, bigint, text) from public;
grant execute on function public.confirm_seller_sale(uuid, jsonb, text, text, bigint, bigint, text) to authenticated;
