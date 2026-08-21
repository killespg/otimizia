-- URL amigável do caso, única por escritório. O UUID continua sendo a chave
-- interna; o slug só aparece em /painel/juridico/processos/[slug].
-- SECURITY DEFINER na atribuição: a unicidade precisa ver casos restritos
-- que o autor da inserção talvez não leia pela RLS.

alter table public.legal_cases
  add column if not exists slug text;

create or replace function public.slugify_legal_case_title(raw text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  s text;
begin
  s := translate(
    lower(trim(coalesce(raw, ''))),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
  );
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := regexp_replace(s, '-{2,}', '-', 'g');
  s := left(s, 72);
  s := regexp_replace(s, '-+$', '');
  if s = '' then
    s := 'caso';
  end if;
  if s ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    s := 'caso-' || s;
  end if;
  return s;
end;
$$;

create or replace function public.legal_case_unique_slug(
  target_org uuid,
  raw_title text,
  exclude_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n integer := 2;
begin
  base := public.slugify_legal_case_title(raw_title);
  candidate := base;
  while exists (
    select 1
    from public.legal_cases c
    where c.org_id = target_org
      and c.slug = candidate
      and (exclude_id is null or c.id is distinct from exclude_id)
  ) loop
    candidate := left(base, 64) || '-' || n::text;
    n := n + 1;
    if n > 500 then
      candidate := left(base, 40) || '-' || replace(coalesce(exclude_id, gen_random_uuid())::text, '-', '');
      exit;
    end if;
  end loop;
  return candidate;
end;
$$;

create or replace function public.assign_legal_case_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.title is distinct from old.title or new.slug is null or new.slug = '' then
    new.slug := public.legal_case_unique_slug(new.org_id, new.title, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists legal_cases_assign_slug on public.legal_cases;
create trigger legal_cases_assign_slug
before insert or update of title, slug
on public.legal_cases
for each row execute function public.assign_legal_case_slug();

do $$
declare
  rec record;
begin
  for rec in
    select id, org_id, title
    from public.legal_cases
    where slug is null or slug = ''
    order by created_at, id
  loop
    update public.legal_cases
    set slug = public.legal_case_unique_slug(rec.org_id, rec.title, rec.id)
    where id = rec.id;
  end loop;
end;
$$;

alter table public.legal_cases
  alter column slug set not null;

alter table public.legal_cases
  drop constraint if exists legal_cases_slug_format;
alter table public.legal_cases
  add constraint legal_cases_slug_format
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index if not exists legal_cases_org_slug_uidx
  on public.legal_cases (org_id, slug);

revoke all on function public.slugify_legal_case_title(text) from public, anon, authenticated;
revoke all on function public.legal_case_unique_slug(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.assign_legal_case_slug() from public, anon, authenticated;
grant execute on function public.slugify_legal_case_title(text) to service_role;
grant execute on function public.legal_case_unique_slug(uuid, text, uuid) to service_role;
grant execute on function public.assign_legal_case_slug() to service_role;
