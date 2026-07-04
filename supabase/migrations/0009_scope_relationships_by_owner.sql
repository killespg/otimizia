-- Garante que vinculos entre contatos, vendas, lembretes e interacoes
-- sempre pertencam ao mesmo owner_id.

update public.deals d
set contact_id = null
where contact_id is not null
  and not exists (
    select 1
    from public.contacts c
    where c.id = d.contact_id
      and c.owner_id = d.owner_id
  );

update public.tasks t
set contact_id = null
where contact_id is not null
  and not exists (
    select 1
    from public.contacts c
    where c.id = t.contact_id
      and c.owner_id = t.owner_id
  );

update public.tasks t
set deal_id = null
where deal_id is not null
  and not exists (
    select 1
    from public.deals d
    where d.id = t.deal_id
      and d.owner_id = t.owner_id
  );

delete from public.interactions i
where not exists (
  select 1
  from public.contacts c
  where c.id = i.contact_id
    and c.owner_id = i.owner_id
);

alter table public.contacts
  add constraint contacts_owner_id_id_unique unique (owner_id, id);

alter table public.deals
  add constraint deals_owner_id_id_unique unique (owner_id, id);

alter table public.deals
  drop constraint if exists deals_contact_id_fkey,
  add constraint deals_owner_contact_fkey
    foreign key (owner_id, contact_id)
    references public.contacts (owner_id, id)
    on delete set null (contact_id);

alter table public.tasks
  drop constraint if exists tasks_contact_id_fkey,
  drop constraint if exists tasks_deal_id_fkey,
  add constraint tasks_owner_contact_fkey
    foreign key (owner_id, contact_id)
    references public.contacts (owner_id, id)
    on delete set null (contact_id),
  add constraint tasks_owner_deal_fkey
    foreign key (owner_id, deal_id)
    references public.deals (owner_id, id)
    on delete set null (deal_id);

alter table public.interactions
  drop constraint if exists interactions_contact_id_fkey,
  add constraint interactions_owner_contact_fkey
    foreign key (owner_id, contact_id)
    references public.contacts (owner_id, id)
    on delete cascade;
