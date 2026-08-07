-- Foto de perfil do usuário.
--
-- Guarda o caminho no Storage, não a URL: a URL pública é derivável do caminho,
-- mas só o caminho permite apagar o arquivo antigo quando a pessoa troca ou
-- remove a foto. Guardar a URL deixaria lixo no bucket a cada troca.
alter table public.profiles
  add column if not exists avatar_path text;

-- A 0072 trocou o UPDATE aberto em `profiles` por uma allowlist de colunas, e
-- coluna nova não entra sozinha: sem este grant a gravação volta 42501
-- ("permission denied for table profiles") mesmo com a RLS liberando a linha.
-- O grant por coluna é cumulativo, então basta conceder a nova.
grant update (avatar_path) on public.profiles to authenticated;

-- Bucket público, como os de imóveis e de vendas. O avatar é desenhado em toda
-- tela do painel: URL assinada exigiria uma chamada ao Storage por renderização
-- de layout. O caminho carrega um UUID, então não é enumerável.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- A primeira pasta do caminho é o id do usuário: cada pessoa só escreve na
-- própria. Diferente dos outros buckets, aqui o escopo não é a organização —
-- a foto pertence à pessoa e a acompanha se ela trocar de empresa.
-- `public = true` só torna anônimo o endpoint de download; a linha em
-- `storage.objects` continua sob RLS. Sem SELECT, a API do Storage não
-- encontra o objeto para apagar e o `remove` volta "sucesso" sem apagar nada —
-- foi assim que as primeiras fotos ficaram órfãs no bucket.
drop policy if exists "profile_photos_select_own" on storage.objects;
create policy "profile_photos_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_photos_insert_own" on storage.objects;
create policy "profile_photos_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_photos_update_own" on storage.objects;
create policy "profile_photos_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_photos_delete_own" on storage.objects;
create policy "profile_photos_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Os `drop policy if exists` deixam a migration reexecutável: ela roda no
-- Supabase local do CI a cada job, e `create policy` sozinho falharia na segunda.
