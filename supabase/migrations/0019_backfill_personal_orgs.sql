-- Cada profile existente ganha uma organização pessoal (1 membro, admin),
-- herdando o billing/trial atual. org_id é preenchido em todos os registros
-- de domínio daquele owner_id. Idempotente (só roda para quem ainda não tem
-- organization_members).
alter table public.profiles add column if not exists active_org_id uuid references public.organizations (id);

do $$
declare
  p record;
  new_org_id uuid;
begin
  for p in
    select * from public.profiles
    where not exists (
      select 1 from public.organization_members m where m.user_id = profiles.id
    )
  loop
    insert into public.organizations (
      name, plan, plan_status, trial_ends_at,
      stripe_customer_id, stripe_subscription_id, current_period_end
    )
    values (
      coalesce(nullif(p.name, ''), 'Minha empresa'),
      p.plan, p.plan_status, p.trial_ends_at,
      p.stripe_customer_id, p.stripe_subscription_id, p.current_period_end
    )
    returning id into new_org_id;

    insert into public.organization_members (org_id, user_id, role)
    values (new_org_id, p.id, 'admin');

    update public.profiles set active_org_id = new_org_id where id = p.id;

    update public.contacts set org_id = new_org_id where owner_id = p.id and org_id is null;
    update public.deals set org_id = new_org_id where owner_id = p.id and org_id is null;
    update public.tasks set org_id = new_org_id where owner_id = p.id and org_id is null;
    update public.interactions set org_id = new_org_id where owner_id = p.id and org_id is null;
  end loop;
end $$;

alter table public.contacts alter column org_id set not null;
alter table public.deals alter column org_id set not null;
alter table public.tasks alter column org_id set not null;
alter table public.interactions alter column org_id set not null;

create index if not exists contacts_org_idx on public.contacts (org_id);
create index if not exists deals_org_idx on public.deals (org_id);
create index if not exists tasks_org_idx on public.tasks (org_id);
create index if not exists interactions_org_idx on public.interactions (org_id);

-- Troca o eixo das FKs compostas de 0009 (owner_id -> org_id): vínculos
-- (deal->contact, task->contact/deal, interaction->contact) agora só ficam
-- consistentes dentro da mesma organização, não mais da mesma pessoa.
-- Os FKs que dependem dos índices únicos antigos precisam cair primeiro,
-- senão o drop das unique constraints falha por dependência.
alter table public.deals drop constraint if exists deals_owner_contact_fkey;
alter table public.tasks drop constraint if exists tasks_owner_contact_fkey;
alter table public.tasks drop constraint if exists tasks_owner_deal_fkey;
alter table public.interactions drop constraint if exists interactions_owner_contact_fkey;

alter table public.contacts drop constraint if exists contacts_owner_id_id_unique;
alter table public.contacts add constraint contacts_org_id_id_unique unique (org_id, id);

alter table public.deals drop constraint if exists deals_owner_id_id_unique;
alter table public.deals add constraint deals_org_id_id_unique unique (org_id, id);
alter table public.deals
  add constraint deals_org_contact_fkey
    foreign key (org_id, contact_id)
    references public.contacts (org_id, id)
    on delete set null (contact_id);

alter table public.tasks
  add constraint tasks_org_contact_fkey
    foreign key (org_id, contact_id)
    references public.contacts (org_id, id)
    on delete set null (contact_id),
  add constraint tasks_org_deal_fkey
    foreign key (org_id, deal_id)
    references public.deals (org_id, id)
    on delete set null (deal_id);

alter table public.interactions
  add constraint interactions_org_contact_fkey
    foreign key (org_id, contact_id)
    references public.contacts (org_id, id)
    on delete cascade;

-- Trigger: além do profile, cria a organização pessoal (admin) ou, se o
-- convite trouxer 'invited_org_id' nos metadados, entra como member na
-- organização convidada em vez de criar uma nova.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_org_id uuid := nullif(new.raw_user_meta_data ->> 'invited_org_id', '')::uuid;
  new_org_id uuid;
begin
  insert into public.profiles (id, name, profession_type, cpf, terms_accepted_at, plan, plan_status, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'profession_type', 'autonomous_seller'),
    new.raw_user_meta_data ->> 'cpf',
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end,
    'pro',
    'trialing',
    now() + interval '30 days'
  );

  if invited_org_id is not null and exists (select 1 from public.organizations where id = invited_org_id) then
    insert into public.organization_members (org_id, user_id, role)
    values (invited_org_id, new.id, 'member')
    on conflict (org_id, user_id) do nothing;
    update public.profiles set active_org_id = invited_org_id where id = new.id;
  else
    insert into public.organizations (name, plan, plan_status, trial_ends_at)
    values (coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Minha empresa'), 'pro', 'trialing', now() + interval '30 days')
    returning id into new_org_id;

    insert into public.organization_members (org_id, user_id, role)
    values (new_org_id, new.id, 'admin');

    update public.profiles set active_org_id = new_org_id where id = new.id;
  end if;

  return new;
end;
$$;
