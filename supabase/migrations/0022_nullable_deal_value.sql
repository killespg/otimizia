-- Permite diferenciar venda sem preço de venda com valor R$ 0,00.
alter table public.deals
  alter column value_cents drop not null,
  alter column value_cents drop default;
