-- Upload real de documentos juridicos. Bucket privado (diferente do
-- deal-photos, publico): a RLS de storage.objects precisa conhecer o caso,
-- nao so a organizacao, para respeitar a confidencialidade (`team`/`restricted`)
-- ja aplicada em legal_documents via can_access_legal_case. Caminho do objeto:
-- `${org_id}/${case_id}/${uuid}.${ext}`.
--
-- As 4 policies abaixo checam o formato uuid dos dois primeiros segmentos
-- do path antes de fazer o cast: sem isso, qualquer objeto fora desse
-- formato (upload futuro com outra convenção, por exemplo) faria o cast
-- ::uuid estourar erro e derrubar a query inteira de listagem do bucket
-- pra todo mundo, em vez de só não dar match pra aquele objeto.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legal-documents',
  'legal-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "legal_documents_storage_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'legal-documents'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.legal_cases c
    where c.id = ((storage.foldername(name))[2])::uuid
      and c.org_id = ((storage.foldername(name))[1])::uuid
      and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id)
  )
);

create policy "legal_documents_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'legal-documents'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.legal_cases c
    where c.id = ((storage.foldername(name))[2])::uuid
      and c.org_id = ((storage.foldername(name))[1])::uuid
      and public.can_manage_legal(c.org_id)
  )
);

create policy "legal_documents_storage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'legal-documents'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.legal_cases c
    where c.id = ((storage.foldername(name))[2])::uuid
      and c.org_id = ((storage.foldername(name))[1])::uuid
      and public.can_manage_legal(c.org_id)
  )
)
with check (
  bucket_id = 'legal-documents'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.legal_cases c
    where c.id = ((storage.foldername(name))[2])::uuid
      and c.org_id = ((storage.foldername(name))[1])::uuid
      and public.can_manage_legal(c.org_id)
  )
);

create policy "legal_documents_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'legal-documents'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.legal_cases c
    where c.id = ((storage.foldername(name))[2])::uuid
      and c.org_id = ((storage.foldername(name))[1])::uuid
      and public.can_manage_legal(c.org_id)
  )
);
