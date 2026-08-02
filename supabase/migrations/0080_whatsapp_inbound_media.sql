-- Mídia recebida do contato (imagem, nota de voz, documento) caía como
-- "unsupported" (ver app/api/whatsapp/webhook/route.ts) porque o bucket e o
-- check de media_type só aceitavam os três tipos de imagem usados no envio
-- manual do inbox. Abre espaço pros tipos que o webhook passa a baixar da
-- Evolution e persistir.

update storage.buckets
set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'audio/ogg', 'application/pdf'],
  file_size_limit = 16777216
where id = 'whatsapp-attachments';

alter table public.whatsapp_attachments
  drop constraint if exists whatsapp_attachments_media_type_check;

alter table public.whatsapp_attachments
  add constraint whatsapp_attachments_media_type_check
  check (media_type in ('image/jpeg', 'image/png', 'image/webp', 'audio/ogg', 'application/pdf'));
