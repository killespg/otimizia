-- Instagram como campo próprio do contato (além de telefone/e-mail), pra
-- quem aborda ou é abordado primeiro por lá em vez de WhatsApp.
alter table public.contacts add column if not exists instagram text;
