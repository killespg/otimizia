-- Vertical imobiliário, parte 3: galeria de fotos ordenável. Tabela dedicada
-- (não o padrão details.photo_urls/photo_paths usado em deal-photos) porque
-- reordenar/excluir por foto exige uma coluna position de verdade. Bucket
-- novo (não reaproveita deal-photos) porque este fica exposto por uma
-- página pública anônima (vitrine) — raio de exposição isolado do fluxo de
-- fotos de negócio.

create table public.real_estate_property_media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null,
  storage_path text not null,
  position integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (org_id, property_id) references public.real_estate_properties(org_id, id) on delete cascade
);
create index real_estate_property_media_property_idx
  on public.real_estate_property_media(property_id, position);

alter table public.real_estate_property_media enable row level security;
create policy "real_estate_property_media_select" on public.real_estate_property_media
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_property_media_write" on public.real_estate_property_media
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "property_photos_select_member"
on storage.objects for select
to authenticated
using (
  bucket_id = 'property-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
);

create policy "property_photos_insert_member"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'property-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
);

create policy "property_photos_update_member"
on storage.objects for update
to authenticated
using (
  bucket_id = 'property-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'property-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
);

create policy "property_photos_delete_member"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'property-photos'
  and exists (
    select 1
    from public.organization_members m
    where m.org_id = ((storage.foldername(name))[1])::uuid
      and m.user_id = auth.uid()
  )
);
