-- Alinha as escritas no bucket de imóveis à mesma autorização usada pelas
-- tabelas e pelas server actions. Antes, qualquer membro da organização
-- conseguia inserir, sobrescrever ou apagar objetos diretamente pela API do
-- Storage, mesmo quando can_manage_realestate(org_id) era falso.

drop policy if exists "property_photos_insert_member" on storage.objects;
drop policy if exists "property_photos_update_member" on storage.objects;
drop policy if exists "property_photos_delete_member" on storage.objects;

create policy "property_photos_insert_manager"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'property-photos'
  and public.can_manage_realestate(
    ((storage.foldername(name))[1])::uuid
  )
);

create policy "property_photos_update_manager"
on storage.objects for update
to authenticated
using (
  bucket_id = 'property-photos'
  and public.can_manage_realestate(
    ((storage.foldername(name))[1])::uuid
  )
)
with check (
  bucket_id = 'property-photos'
  and public.can_manage_realestate(
    ((storage.foldername(name))[1])::uuid
  )
);

create policy "property_photos_delete_manager"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'property-photos'
  and public.can_manage_realestate(
    ((storage.foldername(name))[1])::uuid
  )
);
