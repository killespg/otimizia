-- Foto de perfil do contato no WhatsApp: buscada uma vez via
-- /chat/fetchProfilePictureUrl da Evolution API quando a conversa é criada
-- (ou na próxima mensagem, se ainda não tínhamos), e usada como avatar no
-- inbox em vez de só as iniciais. URL pública do WhatsApp/Evolution — não é
-- um arquivo nosso, não precisa de bucket.
alter table public.whatsapp_conversations
  add column if not exists profile_pic_url text;
