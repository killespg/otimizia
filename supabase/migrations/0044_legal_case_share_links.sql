-- Link publico somente-leitura por caso (sem login de cliente). Cada item
-- (prazo/evento/documento) só aparece nesse link se marcado explicitamente
-- como client_visible — o padrao é sempre desligado. A funcao abaixo nunca
-- toca em legal_expenses/receivables/fee_agreements/receivable_payments:
-- nao e uma omissao de coluna, e ausencia estrutural de acesso a essas
-- tabelas, entao vazar um token nunca expoe dado financeiro.

create table public.legal_case_share_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  label text,
  revoked_at timestamptz,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index legal_case_share_links_case_idx on public.legal_case_share_links(case_id);

alter table public.legal_case_share_links enable row level security;
-- Deriva a permissão do caso (não só do org_id da própria linha): assim um
-- insert com org_id da própria organização mas case_id de um caso alheio
-- (org diferente) é barrado tanto no using quanto no with check, igual ao
-- padrão já usado em legal_case_members_write.
create policy "legal_case_share_links_access" on public.legal_case_share_links for all
  using (exists(select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_case_share_links.org_id and public.can_manage_legal(c.org_id)))
  with check (exists(select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_case_share_links.org_id and public.can_manage_legal(c.org_id)));

alter table public.legal_deadlines add column if not exists client_visible boolean not null default false;
alter table public.legal_case_events add column if not exists client_visible boolean not null default false;
alter table public.legal_documents add column if not exists client_visible boolean not null default false;

create or replace function public.get_shared_case(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.legal_case_share_links%rowtype;
  result jsonb;
begin
  select * into link
  from public.legal_case_share_links
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  -- "não existe", "revogado" e "expirado" retornam o mesmo null — não dar
  -- pista pra quem está tentando adivinhar um token.
  if not found then
    return null;
  end if;

  -- Throttle de 60s: função pública sem sessão, sem rate limit em outra
  -- camada — sem isso, um bot/crawler/preview de link batendo repetido
  -- gera um UPDATE por request nessa linha (write amplification).
  if link.last_accessed_at is null or link.last_accessed_at < now() - interval '60 seconds' then
    update public.legal_case_share_links
    set last_accessed_at = now(), view_count = view_count + 1
    where id = link.id;
  end if;

  select jsonb_build_object(
    'case', jsonb_build_object(
      'title', c.title,
      'status', c.status,
      'area', c.area,
      'court', c.court,
      'jurisdiction', c.jurisdiction,
      'next_deadline_at', c.next_deadline_at
    ),
    'deadlines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', d.title, 'due_at', d.due_at, 'status', d.status, 'deadline_type', d.deadline_type
      ) order by d.due_at)
      from public.legal_deadlines d
      where d.case_id = c.id and d.client_visible = true
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', e.title, 'description', e.description, 'occurred_at', e.occurred_at, 'event_type', e.event_type
      ) order by e.occurred_at desc)
      from public.legal_case_events e
      where e.case_id = c.id and e.client_visible = true
    ), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', doc.name, 'document_type', doc.document_type, 'external_url', doc.external_url
      ) order by doc.created_at desc)
      from public.legal_documents doc
      where doc.case_id = c.id and doc.client_visible = true and doc.external_url is not null
    ), '[]'::jsonb)
  ) into result
  from public.legal_cases c
  where c.id = link.case_id;

  return result;
end;
$$;

grant execute on function public.get_shared_case(uuid) to anon, authenticated;
