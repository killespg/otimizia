-- Opt-out de mensagens automáticas de WhatsApp por contato. Cobre
-- lembretes proativos (visita, ver app/api/cron/visit-reminders/route.ts)
-- e a resposta automática por IA no webhook inbound (ver
-- app/api/whatsapp/webhook/route.ts) — não afeta o envio manual de
-- app/api/whatsapp/send/route.ts, que é o corretor decidindo mandar uma
-- mensagem, não uma automação.
--
-- Reversível: rollback = `alter table public.contacts
--   drop column if exists whatsapp_opt_out, drop column if exists whatsapp_opt_out_at;`
alter table public.contacts
  add column if not exists whatsapp_opt_out boolean not null default false,
  add column if not exists whatsapp_opt_out_at timestamptz;
