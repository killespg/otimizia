insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-photos',
  'deal-photos',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "deal_photos_select_member"
on storage.objects for select
to authenticated
using (
  bucket_id = 'deal-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
);

create policy "deal_photos_insert_member"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'deal-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
);

create policy "deal_photos_update_member"
on storage.objects for update
to authenticated
using (
  bucket_id = 'deal-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'deal-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
);

create policy "deal_photos_delete_member"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'deal-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
);
