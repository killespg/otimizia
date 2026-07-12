-- Minuta de peca processual gerada por IA: guarda o texto direto na linha
-- (sem passar pelo bucket de storage, que so aceita pdf/doc/imagem) para que
-- o advogado leia, copie e revise antes de transformar em peca de verdade.
-- generated_by_ai marca a origem so pra exibir o aviso de revisao na UI.

alter table public.legal_documents
  add column content text,
  add column generated_by_ai boolean not null default false;

alter table public.legal_documents drop constraint if exists legal_documents_check;
alter table public.legal_documents
  add constraint legal_documents_check
  check (storage_path is not null or external_url is not null or content is not null);
