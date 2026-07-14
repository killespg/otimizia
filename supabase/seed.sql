-- Seed de demonstração/teste: um corretor de imóveis com ~2 meses de uso
-- simulado (carteira de imóveis, leads, atendimentos, lembretes, notas de
-- atendimento, conversas de WhatsApp, vitrines compartilhadas, e as tabelas
-- das Fases 0-7 do plano de evolução do CRM imobiliário: preferência de
-- busca, match imóvel<->atendimento, visitas, propostas, checklist
-- documental, comissões, metas e a fila de eventos de domínio). Referenciado
-- por supabase/config.toml (db.seed.sql_paths) e rodado automaticamente em
-- `supabase db reset`.
--
-- Idempotente: todo mundo usa UUID fixo, então rodar este arquivo mais de
-- uma vez não duplica nada (ON CONFLICT DO NOTHING nos inserts; os poucos
-- UPDATE do bloco de Fases 0-7 são idempotentes por natureza — reaplicar o
-- mesmo valor não muda nada). Datas são relativas a now() (interval), não
-- timestamps fixos — o histórico continua parecendo "dos últimos 2 meses"
-- não importa quando o seed for rodado.
--
-- O usuário é inserido direto em auth.users (com senha hasheada via
-- pgcrypto, igual ao GoTrue) em vez de passar pela API de signup, porque
-- este script roda offline contra o Postgres. O trigger handle_new_user()
-- (ver 0051_real_estate_job_roles.sql) cuida do resto — cria profile,
-- organização própria (job_role 'owner') e vincula profession_type
-- 'real_estate_broker' — exatamente como um cadastro real pelo formulário.

do $$
declare
  v_user_id uuid := '00000000-0000-4000-8000-000000000001';
  v_org_id uuid;

  -- Leads/clientes (contacts)
  c1 uuid := '00000000-0000-4000-8000-000000000c01'; -- Fernanda Alves (compradora)
  c2 uuid := '00000000-0000-4000-8000-000000000c02'; -- Roberto Nunes (vendedor)
  c3 uuid := '00000000-0000-4000-8000-000000000c03'; -- Juliana Prado (locatária)
  c4 uuid := '00000000-0000-4000-8000-000000000c04'; -- Marcos Teixeira (investidor)
  c5 uuid := '00000000-0000-4000-8000-000000000c05'; -- Carla Souza (proprietária)
  c6 uuid := '00000000-0000-4000-8000-000000000c06'; -- Eduardo Lima (comprador)
  c7 uuid := '00000000-0000-4000-8000-000000000c07'; -- Studio Prado Contabilidade (locatária PJ)

  -- Imóveis referenciados fora da lista principal (pra montar vitrines)
  p_a1 uuid := '00000000-0000-4000-8000-0000000000a1';
  p_a3 uuid := '00000000-0000-4000-8000-0000000000a3';
  p_a4 uuid := '00000000-0000-4000-8000-0000000000a4';
  p_a6 uuid := '00000000-0000-4000-8000-0000000000a6';
  p_a7 uuid := '00000000-0000-4000-8000-0000000000a7';
  p_a8 uuid := '00000000-0000-4000-8000-0000000000a8';
  p_a9 uuid := '00000000-0000-4000-8000-0000000000a9';
  p_aa uuid := '00000000-0000-4000-8000-0000000000aa';
  p_ab uuid := '00000000-0000-4000-8000-0000000000ab';
  p_ac uuid := '00000000-0000-4000-8000-0000000000ac';

  sc1 uuid := '00000000-0000-4000-8001-000000000c01'; -- vitrine: Fernanda
  sc2 uuid := '00000000-0000-4000-8001-000000000c02'; -- vitrine: Marcos

  -- Fases 0-7 do plano de evolução do CRM imobiliário (RE-0xx a RE-7xx):
  -- visitas e propostas viram FK de crm_domain_events, então precisam de
  -- variável (não dá pra referenciar um literal ainda não inserido).
  v1 uuid := '00000000-0000-4000-8004-000000000001'; -- visita: Fernanda no Apto Jardins (concluída)
  v2 uuid := '00000000-0000-4000-8004-000000000002'; -- visita: Marcos no Galpão Cotia (concluída)
  v3 uuid := '00000000-0000-4000-8004-000000000003'; -- visita: Marcos no Galpão Cotia (técnica, agendada)
  v4 uuid := '00000000-0000-4000-8004-000000000004'; -- visita: Fernanda no Studio Consolação (só solicitada)
  o1 uuid := '00000000-0000-4000-8005-000000000001'; -- proposta: Fernanda no Apto Jardins (enviada)
  o2 uuid := '00000000-0000-4000-8005-000000000002'; -- proposta: Marcos no Galpão Cotia (rascunho)
  o3 uuid := '00000000-0000-4000-8005-000000000003'; -- proposta: Eduardo no Apto Vila Madalena (aceita, já fechada)
begin
  if not exists (select 1 from auth.users where id = v_user_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'corretor.teste@useotimizia.com',
      crypt('Corretor@Teste123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'name', 'Ana Corretora (Teste)',
        'profession_type', 'real_estate_broker',
        'profession_types', jsonb_build_array('real_estate_broker'),
        'terms_accepted', 'true'
      ),
      now(), now(), '', '', '', ''
    );

    -- Necessário para login por email/senha funcionar via GoTrue (Supabase
    -- Auth exige uma linha em auth.identities além de auth.users).
    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'corretor.teste@useotimizia.com'),
      'email', now(), now()
    );
  end if;

  select active_org_id into v_org_id from public.profiles where id = v_user_id;

  -- =========================================================
  -- Carteira de imóveis (12: disponível, reservado, vendido, alugado, inativo)
  -- =========================================================
  insert into public.real_estate_properties (
    id, org_id, created_by, assignee_id, title, property_type, transaction_type,
    status, price_cents, rent_price_cents, condo_fee_cents, iptu_cents,
    bedrooms, bathrooms, parking_spots, area_m2,
    address_street, address_number, address_neighborhood, address_city,
    address_state, address_zip, description, created_at, updated_at
  ) values
    ('00000000-0000-4000-8000-0000000000a1', v_org_id, v_user_id, v_user_id,
     'Apartamento 3 quartos com varanda gourmet', 'apartamento', 'venda', 'ativo',
     85000000, null, 65000, 18000, 3, 2, 2, 98.5,
     'Rua das Palmeiras', '450', 'Jardins', 'São Paulo', 'SP', '01402-000',
     'Apartamento reformado, sol da manhã, próximo ao metrô.',
     now() - interval '25 days', now() - interval '25 days'),
    ('00000000-0000-4000-8000-0000000000a2', v_org_id, v_user_id, v_user_id,
     'Casa térrea com quintal e churrasqueira', 'casa', 'venda', 'ativo',
     62000000, null, 45000, 9500, 4, 3, 4, 220,
     'Rua dos Ipês', '120', 'Alto de Pinheiros', 'São Paulo', 'SP', '05461-010',
     'Casa em condomínio fechado, ótima para famílias.',
     now() - interval '32 days', now() - interval '32 days'),
    ('00000000-0000-4000-8000-0000000000a3', v_org_id, v_user_id, v_user_id,
     'Cobertura duplex com piscina privativa', 'cobertura', 'venda_aluguel', 'reservado',
     195000000, 1200000, 250000, 42000, 4, 4, 3, 310,
     'Avenida Brigadeiro Faria Lima', '2100', 'Itaim Bibi', 'São Paulo', 'SP', '04538-132',
     'Vista panorâmica, acabamento de altíssimo padrão.',
     now() - interval '38 days', now() - interval '9 days'),
    ('00000000-0000-4000-8000-0000000000a4', v_org_id, v_user_id, v_user_id,
     'Terreno plano pronto para construir', 'terreno', 'venda', 'ativo',
     45000000, null, null, 6000, null, null, null, 500,
     'Estrada da Serra', 'S/N', 'Granja Viana', 'Cotia', 'SP', '06710-000',
     'Documentação regularizada, ao lado de condomínio de alto padrão.',
     now() - interval '30 days', now() - interval '30 days'),
    ('00000000-0000-4000-8000-0000000000a5', v_org_id, v_user_id, v_user_id,
     'Sala comercial em prédio corporativo', 'sala', 'aluguel', 'ativo',
     null, 380000, 38000, 4200, null, 1, 1, 45,
     'Avenida Paulista', '900', 'Bela Vista', 'São Paulo', 'SP', '01310-100',
     'Andar alto, infraestrutura de coworking no prédio.',
     now() - interval '20 days', now() - interval '20 days'),
    ('00000000-0000-4000-8000-0000000000a6', v_org_id, v_user_id, v_user_id,
     'Apartamento 2 quartos reformado', 'apartamento', 'venda', 'vendido',
     42000000, null, 38000, 9000, 2, 1, 1, 65,
     'Rua Harmonia', '300', 'Vila Madalena', 'São Paulo', 'SP', '05435-000',
     'Vendido rápido, primeira semana de anúncio.',
     now() - interval '55 days', now() - interval '45 days'),
    ('00000000-0000-4000-8000-0000000000a7', v_org_id, v_user_id, v_user_id,
     'Casa geminada em bairro residencial', 'casa', 'venda', 'vendido',
     51000000, null, null, 7000, 3, 2, 2, 160,
     'Rua Girassol', '88', 'Vila Madalena', 'São Paulo', 'SP', '05433-000',
     'Reforma recente, pronta pra morar.',
     now() - interval '50 days', now() - interval '20 days'),
    ('00000000-0000-4000-8000-0000000000a8', v_org_id, v_user_id, v_user_id,
     'Apartamento compacto para investidor', 'apartamento', 'aluguel', 'alugado',
     null, 260000, 42000, 5500, 1, 1, 1, 42,
     'Rua Augusta', '1200', 'Consolação', 'São Paulo', 'SP', '01305-100',
     'Próximo ao metrô Consolação, ideal pra locação.',
     now() - interval '45 days', now() - interval '15 days'),
    ('00000000-0000-4000-8000-0000000000a9', v_org_id, v_user_id, v_user_id,
     'Loja de rua com vitrine', 'comercial', 'aluguel', 'alugado',
     null, 550000, null, 12000, null, 1, 0, 80,
     'Rua Oscar Freire', '540', 'Jardins', 'São Paulo', 'SP', '01426-000',
     'Vitrine ampla, alto fluxo de pedestres.',
     now() - interval '40 days', now() - interval '8 days'),
    ('00000000-0000-4000-8000-0000000000aa', v_org_id, v_user_id, v_user_id,
     'Apartamento garden com quintal privativo', 'apartamento', 'venda', 'ativo',
     71000000, null, 55000, 15000, 3, 2, 2, 110,
     'Rua Cardeal Arcoverde', '700', 'Pinheiros', 'São Paulo', 'SP', '05407-002',
     'Área externa privativa, raro no bairro.',
     now() - interval '15 days', now() - interval '15 days'),
    ('00000000-0000-4000-8000-0000000000ab', v_org_id, v_user_id, v_user_id,
     'Galpão logístico com pé direito alto', 'galpao', 'venda_aluguel', 'reservado',
     320000000, 4500000, null, 60000, null, 2, 10, 1200,
     'Rodovia Raposo Tavares km 25', 'S/N', 'Distrito Industrial', 'Cotia', 'SP', '06710-500',
     'Acesso facilitado para caminhões, docas niveladas.',
     now() - interval '12 days', now() - interval '3 days'),
    ('00000000-0000-4000-8000-0000000000ac', v_org_id, v_user_id, v_user_id,
     'Studio antigo, retirado do mercado', 'apartamento', 'venda', 'inativo',
     28000000, null, 30000, 4000, 1, 1, 0, 28,
     'Rua Consolação', '2000', 'Consolação', 'São Paulo', 'SP', '01302-000',
     'Proprietário desistiu da venda por ora.',
     now() - interval '58 days', now() - interval '50 days')
  on conflict (id) do nothing;

  -- =========================================================
  -- Leads/clientes (contacts)
  -- =========================================================
  insert into public.contacts (
    id, owner_id, org_id, workspace_key, name, phone, email, instagram,
    company, source, notes, details, created_at
  ) values
    (c1, v_user_id, v_org_id, 'real_estate_broker', 'Fernanda Alves', '+55 11 98888-1001',
     'fernanda.alves@example.com', '@fernanda.alves', null, 'Instagram',
     'Prefere imóveis com varanda, já visitou 2 opções.',
     jsonb_build_object('perfil_lead', 'Comprador', 'orcamento', 'até R$ 700 mil', 'bairro', 'Jardins'),
     now() - interval '50 days'),
    (c2, v_user_id, v_org_id, 'real_estate_broker', 'Roberto Nunes', '+55 11 98888-1002',
     'roberto.nunes@example.com', null, null, 'Indicação',
     'Dono da casa na Vila Madalena, já vendida.',
     jsonb_build_object('perfil_lead', 'Vendedor', 'orcamento', '', 'bairro', 'Vila Madalena'),
     now() - interval '52 days'),
    (c3, v_user_id, v_org_id, 'real_estate_broker', 'Juliana Prado', '+55 11 98888-1003',
     'juliana.prado@example.com', null, null, 'Site',
     'Fechou aluguel do apto na Augusta.',
     jsonb_build_object('perfil_lead', 'Locatário', 'orcamento', 'até R$ 2.800/mês', 'bairro', 'Consolação'),
     now() - interval '47 days'),
    (c4, v_user_id, v_org_id, 'real_estate_broker', 'Marcos Teixeira', '+55 11 98888-1004',
     'marcos.teixeira@example.com', null, null, 'WhatsApp',
     'Investidor, interessado em galpão e cobertura.',
     jsonb_build_object('perfil_lead', 'Comprador', 'orcamento', 'até R$ 3,5 milhões', 'bairro', 'Itaim Bibi'),
     now() - interval '38 days'),
    (c5, v_user_id, v_org_id, 'real_estate_broker', 'Carla Souza', '+55 11 98888-1005',
     'carla.souza@example.com', null, null, 'Indicação',
     'Dona do terreno em Cotia, avaliando propostas.',
     jsonb_build_object('perfil_lead', 'Proprietário', 'orcamento', '', 'bairro', 'Granja Viana'),
     now() - interval '42 days'),
    (c6, v_user_id, v_org_id, 'real_estate_broker', 'Eduardo Lima', '+55 11 98888-1006',
     'eduardo.lima@example.com', null, null, 'Facebook Ads',
     'Primeiro imóvel, financiamento aprovado.',
     jsonb_build_object('perfil_lead', 'Comprador', 'orcamento', 'até R$ 450 mil', 'bairro', 'Vila Madalena'),
     now() - interval '58 days'),
    (c7, v_user_id, v_org_id, 'real_estate_broker', 'Studio Prado Contabilidade', '+55 11 3333-1007',
     'contato@studioprado.com.br', null, 'Studio Prado Contabilidade', 'Indicação',
     'Buscava loja de rua para nova sede.',
     jsonb_build_object('perfil_lead', 'Locatário', 'orcamento', '', 'bairro', 'Jardins'),
     now() - interval '41 days')
  on conflict (id) do nothing;

  -- =========================================================
  -- Atendimentos (deals) — cobre todas as etapas do funil
  -- =========================================================
  insert into public.deals (
    id, owner_id, org_id, workspace_key, contact_id, assignee_id, title,
    value_cents, stage, position, details, created_at, closed_at
  ) values
    ('00000000-0000-4000-8000-0000000000d1', v_user_id, v_org_id, 'real_estate_broker', c6, v_user_id,
     'Eduardo Lima – Apto 2 quartos Vila Madalena', 42000000, 'ganho', 0,
     jsonb_build_object('tipo_imovel', 'Apartamento'), now() - interval '55 days', now() - interval '45 days'),
    ('00000000-0000-4000-8000-0000000000d2', v_user_id, v_org_id, 'real_estate_broker', c2, v_user_id,
     'Roberto Nunes – Venda da casa na Vila Madalena', 51000000, 'ganho', 1,
     jsonb_build_object('tipo_imovel', 'Casa'), now() - interval '50 days', now() - interval '20 days'),
    ('00000000-0000-4000-8000-0000000000d3', v_user_id, v_org_id, 'real_estate_broker', c3, v_user_id,
     'Juliana Prado – Aluguel apto Consolação', 260000, 'ganho', 2,
     jsonb_build_object('tipo_imovel', 'Apartamento'), now() - interval '45 days', now() - interval '15 days'),
    ('00000000-0000-4000-8000-0000000000d4', v_user_id, v_org_id, 'real_estate_broker', c7, v_user_id,
     'Studio Prado – Locação loja Jardins', 550000, 'ganho', 3,
     jsonb_build_object('tipo_imovel', 'Comercial'), now() - interval '40 days', now() - interval '8 days'),
    ('00000000-0000-4000-8000-0000000000d5', v_user_id, v_org_id, 'real_estate_broker', c1, v_user_id,
     'Fernanda Alves – Apartamento até R$700 mil em Jardins', 85000000, 'negociacao', 4,
     jsonb_build_object('tipo_imovel', 'Apartamento'), now() - interval '25 days', null),
    ('00000000-0000-4000-8000-0000000000d6', v_user_id, v_org_id, 'real_estate_broker', c4, v_user_id,
     'Marcos Teixeira – Galpão logístico Cotia', 320000000, 'negociacao', 5,
     jsonb_build_object('tipo_imovel', 'Comercial'), now() - interval '12 days', null),
    ('00000000-0000-4000-8000-0000000000d7', v_user_id, v_org_id, 'real_estate_broker', c5, v_user_id,
     'Carla Souza – Venda do terreno em Cotia', 45000000, 'em_contato', 6,
     jsonb_build_object('tipo_imovel', 'Terreno'), now() - interval '30 days', null),
    ('00000000-0000-4000-8000-0000000000d8', v_user_id, v_org_id, 'real_estate_broker', c4, v_user_id,
     'Marcos Teixeira – Cobertura Itaim Bibi (proposta recusada)', 195000000, 'perdido', 7,
     jsonb_build_object('tipo_imovel', 'Apartamento'), now() - interval '38 days', now() - interval '34 days'),
    ('00000000-0000-4000-8000-0000000000d9', v_user_id, v_org_id, 'real_estate_broker', c1, v_user_id,
     'Fernanda Alves – Segunda opção: studio Consolação', 28000000, 'novo', 8,
     jsonb_build_object('tipo_imovel', 'Apartamento'), now() - interval '5 days', null)
  on conflict (id) do nothing;

  -- =========================================================
  -- Lembretes (tasks) — sem FK pra imóvel (schema não tem uma), associação
  -- pelo título/contato/atendimento, igual ao padrão do resto do produto.
  -- =========================================================
  insert into public.tasks (
    id, owner_id, org_id, workspace_key, assignee_id, contact_id, deal_id, title, due_at, done
  ) values
    ('00000000-0000-4000-8000-0000000000b1', v_user_id, v_org_id, 'real_estate_broker', v_user_id, null, null,
     'Ligar para cliente interessado no Apto Jardins', now() + interval '2 days', false),
    ('00000000-0000-4000-8000-0000000000b2', v_user_id, v_org_id, 'real_estate_broker', v_user_id, null, null,
     'Agendar visita — Cobertura Itaim Bibi', now() + interval '1 day', false),
    ('00000000-0000-4000-8000-0000000000b3', v_user_id, v_org_id, 'real_estate_broker', v_user_id, null, null,
     'Renovar fotos da Casa Alto de Pinheiros', now(), false),
    ('00000000-0000-4000-8000-0000000000b4', v_user_id, v_org_id, 'real_estate_broker', v_user_id, null, null,
     'Follow-up de proposta — Sala Comercial Paulista', now() - interval '2 days', false),
    ('00000000-0000-4000-8000-0000000000b5', v_user_id, v_org_id, 'real_estate_broker', v_user_id, null, null,
     'Confirmar documentação do Terreno Granja Viana', now() - interval '5 days', true),
    ('00000000-0000-4000-8000-0000000000b6', v_user_id, v_org_id, 'real_estate_broker', v_user_id, c1,
     '00000000-0000-4000-8000-0000000000d5', 'Follow-up da proposta da Fernanda (Apto Jardins)',
     now() + interval '3 days', false),
    ('00000000-0000-4000-8000-0000000000b7', v_user_id, v_org_id, 'real_estate_broker', v_user_id, c4,
     '00000000-0000-4000-8000-0000000000d6', 'Enviar contrato do galpão pro Marcos assinar',
     now() + interval '4 days', false),
    ('00000000-0000-4000-8000-0000000000b8', v_user_id, v_org_id, 'real_estate_broker', v_user_id, c5,
     '00000000-0000-4000-8000-0000000000d7', 'Cobrar retorno da Carla sobre o terreno',
     now() - interval '1 day', false),
    ('00000000-0000-4000-8000-0000000000b9', v_user_id, v_org_id, 'real_estate_broker', v_user_id, c2,
     '00000000-0000-4000-8000-0000000000d2', 'Confirmar registro em cartório – venda Roberto Nunes',
     now() - interval '18 days', true),
    ('00000000-0000-4000-8000-0000000000ba', v_user_id, v_org_id, 'real_estate_broker', v_user_id, c3,
     '00000000-0000-4000-8000-0000000000d3', 'Vistoria de entrada do apto alugado – Juliana',
     now() - interval '14 days', true),
    ('00000000-0000-4000-8000-0000000000bb', v_user_id, v_org_id, 'real_estate_broker', v_user_id, c7,
     '00000000-0000-4000-8000-0000000000d4', 'Assinatura do contrato da loja – Studio Prado',
     now() - interval '7 days', true),
    ('00000000-0000-4000-8000-0000000000bc', v_user_id, v_org_id, 'real_estate_broker', v_user_id, c6,
     '00000000-0000-4000-8000-0000000000d1', 'Entrega das chaves – Eduardo Lima',
     now() - interval '44 days', true),
    ('00000000-0000-4000-8000-0000000000bd', v_user_id, v_org_id, 'real_estate_broker', v_user_id, null, null,
     'Atualizar fotos do portfólio de imóveis ativos', now() + interval '7 days', false),
    ('00000000-0000-4000-8000-0000000000be', v_user_id, v_org_id, 'real_estate_broker', v_user_id, null, null,
     'Revisar preços dos imóveis parados há mais de 30 dias', now() + interval '10 days', false),
    ('00000000-0000-4000-8000-0000000000bf', v_user_id, v_org_id, 'real_estate_broker', v_user_id, c1,
     '00000000-0000-4000-8000-0000000000d9', 'Ligar pra Fernanda sobre segunda opção (Studio Consolação)',
     now() + interval '1 day', false)
  on conflict (id) do nothing;

  -- =========================================================
  -- Notas de atendimento (interactions) — histórico de ligações/visitas/
  -- propostas por lead.
  -- =========================================================
  insert into public.interactions (id, owner_id, org_id, workspace_key, contact_id, body, created_at) values
    ('00000000-0000-4000-8000-000000000e01', v_user_id, v_org_id, 'real_estate_broker', c1,
     'Ligação inicial: apresentei 3 opções no perfil dela, gostou do Apto Jardins.', now() - interval '25 days'),
    ('00000000-0000-4000-8000-000000000e02', v_user_id, v_org_id, 'real_estate_broker', c1,
     'Visita agendada e realizada no Apto Jardins, feedback muito positivo.', now() - interval '18 days'),
    ('00000000-0000-4000-8000-000000000e03', v_user_id, v_org_id, 'real_estate_broker', c1,
     'Enviei proposta formal de R$ 850 mil, aguardando retorno do proprietário.', now() - interval '6 days'),
    ('00000000-0000-4000-8000-000000000e04', v_user_id, v_org_id, 'real_estate_broker', c2,
     'Avaliação de mercado feita, sugerido preço de R$ 510 mil pra casa.', now() - interval '50 days'),
    ('00000000-0000-4000-8000-000000000e05', v_user_id, v_org_id, 'real_estate_broker', c2,
     'Fotos profissionais tiradas e anúncio publicado.', now() - interval '48 days'),
    ('00000000-0000-4000-8000-000000000e06', v_user_id, v_org_id, 'real_estate_broker', c2,
     'Proposta aceita, documentação encaminhada para o cartório.', now() - interval '22 days'),
    ('00000000-0000-4000-8000-000000000e07', v_user_id, v_org_id, 'real_estate_broker', c3,
     'Perfil de locação analisado, enviei 4 opções na região da Consolação.', now() - interval '46 days'),
    ('00000000-0000-4000-8000-000000000e08', v_user_id, v_org_id, 'real_estate_broker', c3,
     'Visita ao apto na Augusta, aprovou de primeira.', now() - interval '44 days'),
    ('00000000-0000-4000-8000-000000000e09', v_user_id, v_org_id, 'real_estate_broker', c3,
     'Contrato de locação assinado.', now() - interval '15 days'),
    ('00000000-0000-4000-8000-000000000e0a', v_user_id, v_org_id, 'real_estate_broker', c4,
     'Reunião apresentando portfólio de imóveis comerciais e coberturas.', now() - interval '38 days'),
    ('00000000-0000-4000-8000-000000000e0b', v_user_id, v_org_id, 'real_estate_broker', c4,
     'Visita à cobertura no Itaim Bibi, achou o condomínio muito alto.', now() - interval '36 days'),
    ('00000000-0000-4000-8000-000000000e0c', v_user_id, v_org_id, 'real_estate_broker', c4,
     'Apresentei o galpão em Cotia, muito interessado na localização.', now() - interval '12 days'),
    ('00000000-0000-4000-8000-000000000e0d', v_user_id, v_org_id, 'real_estate_broker', c5,
     'Primeira conversa sobre venda do terreno, alinhado valor de mercado.', now() - interval '30 days'),
    ('00000000-0000-4000-8000-000000000e0e', v_user_id, v_org_id, 'real_estate_broker', c6,
     'Financiamento aprovado pelo banco, iniciamos busca por apartamento.', now() - interval '58 days')
  on conflict (id) do nothing;

  -- =========================================================
  -- WhatsApp: instância + 2 conversas + histórico de mensagens
  -- =========================================================
  insert into public.whatsapp_instances (id, org_id, instance_name, status, phone_number, created_at)
  values (
    '00000000-0000-4000-8000-000000000f00', v_org_id,
    'broker-teste-' || replace(v_org_id::text, '-', ''), 'conectado', '+5511999990000',
    now() - interval '58 days'
  )
  on conflict (id) do nothing;

  insert into public.whatsapp_conversations (
    id, org_id, contact_id, phone_number, contact_name, ia_active, last_message_at, created_at
  ) values
    ('00000000-0000-4000-8000-000000000f01', v_org_id, c1, '+5511988881001', 'Fernanda Alves',
     true, now() - interval '18 days', now() - interval '25 days'),
    ('00000000-0000-4000-8000-000000000f02', v_org_id, c4, '+5511988881004', 'Marcos Teixeira',
     false, now() - interval '11 days', now() - interval '38 days')
  on conflict (id) do nothing;

  insert into public.whatsapp_messages (
    id, conversation_id, org_id, direction, message_type, content, sent_by, created_at, read_at
  ) values
    ('00000000-0000-4000-8000-000000000f03', '00000000-0000-4000-8000-000000000f01', v_org_id, 'inbound', 'text',
     'Oi, vi o apartamento nos Jardins no Instagram, ainda está disponível?', 'contact', now() - interval '25 days', now() - interval '25 days'),
    ('00000000-0000-4000-8000-000000000f04', '00000000-0000-4000-8000-000000000f01', v_org_id, 'outbound', 'text',
     'Oi Fernanda! Sim, ainda está disponível. Posso te enviar mais fotos e agendar uma visita?', 'ai', now() - interval '25 days', null),
    ('00000000-0000-4000-8000-000000000f05', '00000000-0000-4000-8000-000000000f01', v_org_id, 'inbound', 'text',
     'Pode sim, adoraria ver mais fotos.', 'contact', now() - interval '25 days', now() - interval '25 days'),
    ('00000000-0000-4000-8000-000000000f06', '00000000-0000-4000-8000-000000000f01', v_org_id, 'outbound', 'text',
     'Te enviei as fotos e já deixei uma visita agendada pra sexta às 15h.', 'human', now() - interval '24 days', null),
    ('00000000-0000-4000-8000-000000000f07', '00000000-0000-4000-8000-000000000f01', v_org_id, 'inbound', 'text',
     'Adorei o apartamento na visita! Quero fazer uma proposta.', 'contact', now() - interval '18 days', now() - interval '18 days'),
    ('00000000-0000-4000-8000-000000000f08', '00000000-0000-4000-8000-000000000f01', v_org_id, 'outbound', 'text',
     'Que ótimo! Vou preparar a proposta de R$ 850 mil e te envio ainda hoje.', 'human', now() - interval '18 days', null),
    ('00000000-0000-4000-8000-000000000f09', '00000000-0000-4000-8000-000000000f01', v_org_id, 'inbound', 'text',
     'Perfeito, aguardo :)', 'contact', now() - interval '18 days', now() - interval '18 days'),
    ('00000000-0000-4000-8000-000000000f0a', '00000000-0000-4000-8000-000000000f02', v_org_id, 'inbound', 'text',
     'Bom dia, tenho interesse em imóveis comerciais para investimento.', 'contact', now() - interval '38 days', now() - interval '38 days'),
    ('00000000-0000-4000-8000-000000000f0b', '00000000-0000-4000-8000-000000000f02', v_org_id, 'outbound', 'text',
     'Bom dia Marcos! Temos algumas opções de galpões e coberturas, posso te enviar o portfólio?', 'ai', now() - interval '38 days', null),
    ('00000000-0000-4000-8000-000000000f0c', '00000000-0000-4000-8000-000000000f02', v_org_id, 'inbound', 'text',
     'Pode enviar sim.', 'contact', now() - interval '38 days', now() - interval '38 days'),
    ('00000000-0000-4000-8000-000000000f0d', '00000000-0000-4000-8000-000000000f02', v_org_id, 'outbound', 'text',
     'Segue o portfólio! O galpão em Cotia tem ótima localização e docas niveladas.', 'human', now() - interval '12 days', null),
    ('00000000-0000-4000-8000-000000000f0e', '00000000-0000-4000-8000-000000000f02', v_org_id, 'inbound', 'text',
     'Gostei bastante, vamos marcar uma visita técnica.', 'contact', now() - interval '11 days', now() - interval '11 days')
  on conflict (id) do nothing;

  -- =========================================================
  -- Vitrines compartilhadas (real_estate_share_collections) + reações do
  -- cliente na vitrine pública.
  -- =========================================================
  insert into public.real_estate_share_collections (
    id, org_id, workspace_key, created_by, title, client_contact_id,
    last_accessed_at, view_count, created_at
  ) values
    (sc1, v_org_id, 'real_estate_broker', v_user_id, 'Seleção pra Fernanda – Jardins e região', c1,
     now() - interval '17 days', 4, now() - interval '25 days'),
    (sc2, v_org_id, 'real_estate_broker', v_user_id, 'Portfólio comercial pro Marcos', c4,
     now() - interval '11 days', 6, now() - interval '38 days')
  on conflict (id) do nothing;

  insert into public.real_estate_share_collection_items (id, collection_id, org_id, property_id, position, created_at)
  values
    ('00000000-0000-4000-8001-000000000101', sc1, v_org_id, p_a1, 0, now() - interval '25 days'),
    ('00000000-0000-4000-8001-000000000102', sc1, v_org_id, p_aa, 1, now() - interval '25 days'),
    ('00000000-0000-4000-8001-000000000103', sc2, v_org_id, p_ab, 0, now() - interval '38 days'),
    ('00000000-0000-4000-8001-000000000104', sc2, v_org_id, p_a3, 1, now() - interval '38 days'),
    ('00000000-0000-4000-8001-000000000105', sc2, v_org_id, p_a9, 2, now() - interval '38 days')
  on conflict (id) do nothing;

  insert into public.real_estate_property_reactions (
    id, org_id, collection_id, property_id, reaction, created_at, updated_at
  ) values
    ('00000000-0000-4000-8001-000000000201', v_org_id, sc1, p_a1, 'interessado', now() - interval '17 days', now() - interval '17 days'),
    ('00000000-0000-4000-8001-000000000202', v_org_id, sc1, p_aa, 'sem_interesse', now() - interval '17 days', now() - interval '17 days'),
    ('00000000-0000-4000-8001-000000000203', v_org_id, sc2, p_ab, 'quero_visitar', now() - interval '11 days', now() - interval '11 days'),
    ('00000000-0000-4000-8001-000000000204', v_org_id, sc2, p_a3, 'sem_interesse', now() - interval '11 days', now() - interval '11 days'),
    ('00000000-0000-4000-8001-000000000205', v_org_id, sc2, p_a9, 'sem_interesse', now() - interval '11 days', now() - interval '11 days')
  on conflict (id) do nothing;

  -- =========================================================
  -- Fases 0-7 do plano de evolução do CRM imobiliário (RE-0xx a RE-7xx).
  -- Liga a v2 pra esta organização, senão nada do que segue aparece na UI
  -- (mesma flag ligada manualmente na organização real de teste, ver
  -- 0057_real_estate_v2_feature_flag.sql).
  -- =========================================================
  update public.organizations set real_estate_v2_enabled = true where id = v_org_id;

  -- Fase 0 (RE-0xx): campos de captação em cima dos imóveis que já existem.
  update public.real_estate_properties set
    captured_by = v_user_id, capture_source = 'Prospecção ativa',
    exclusive_listing = true, exclusive_until = now() + interval '10 days',
    commission_percent = 5.00, registration_number = 'matrícula 33.221 - 11º RI SP',
    occupancy_status = 'vazio', key_location = 'Portaria do prédio',
    listing_quality_score = 95
  where id = p_a1;
  update public.real_estate_properties set
    owner_contact_id = c5, captured_by = v_user_id, capture_source = 'Indicação',
    exclusive_listing = true, exclusive_until = now() + interval '45 days',
    commission_percent = 6.00, registration_number = 'matrícula 12.345 - 2º RI Cotia',
    occupancy_status = 'vazio', key_location = 'Sem chave, terreno aberto',
    listing_quality_score = 62
  where id = p_a4;
  update public.real_estate_properties set
    owner_contact_id = c2, captured_by = v_user_id, capture_source = 'Indicação',
    commission_percent = 6.00, registration_number = 'matrícula 78.901 - 9º RI SP',
    occupancy_status = 'desocupado', key_location = 'Com o proprietário',
    listing_quality_score = 90
  where id = p_a7;
  update public.real_estate_properties set
    captured_by = v_user_id, capture_source = 'Prospecção ativa',
    commission_percent = 4.00, registration_number = 'matrícula 55.010 - 3º RI Cotia',
    occupancy_status = 'vazio', key_location = 'Zelador no local',
    listing_quality_score = 78
  where id = p_ab;

  -- Fase 1 (RE-1xx): perfil de busca por atendimento.
  insert into public.real_estate_lead_preferences (
    id, org_id, contact_id, deal_id, transaction_type, property_types,
    min_price_cents, max_price_cents, neighborhoods, cities, min_bedrooms,
    min_parking_spots, financing_needed, notes, created_at, updated_at
  ) values
    ('00000000-0000-4000-8002-000000000001', v_org_id, c1, '00000000-0000-4000-8000-0000000000d5',
     'venda', array['apartamento'], 60000000, 90000000, array['Jardins', 'Itaim Bibi'], array['São Paulo'],
     2, 1, true, 'Prioriza sol da manhã e proximidade de metrô.',
     now() - interval '25 days', now() - interval '20 days'),
    ('00000000-0000-4000-8002-000000000002', v_org_id, c4, '00000000-0000-4000-8000-0000000000d6',
     'venda_aluguel', array['galpao', 'comercial'], null, 350000000, array['Cotia', 'Distrito Industrial'],
     array['Cotia', 'São Paulo'], null, null, false, 'Precisa de pé direito alto e docas niveladas.',
     now() - interval '12 days', now() - interval '5 days'),
    ('00000000-0000-4000-8002-000000000003', v_org_id, c3, '00000000-0000-4000-8000-0000000000d3',
     'aluguel', array['apartamento'], null, 280000, array['Consolação'], array['São Paulo'],
     null, 1, false, 'Fechou rápido, já tinha o perfil bem definido desde a primeira ligação.',
     now() - interval '46 days', now() - interval '46 days')
  on conflict (id) do nothing;

  -- Fase 1 (RE-1xx): vínculo imóvel <-> atendimento com resultado do match.
  insert into public.real_estate_deal_properties (
    id, org_id, deal_id, property_id, match_score, match_explanation, status, source,
    sent_at, viewed_at, reaction, created_at, updated_at
  ) values
    ('00000000-0000-4000-8003-000000000001', v_org_id, '00000000-0000-4000-8000-0000000000d5', p_a1,
     92, jsonb_build_object('preco', jsonb_build_object('points', 30, 'max', 30), 'bairro', jsonb_build_object('points', 25, 'max', 25), 'quartos', jsonb_build_object('points', 20, 'max', 20)),
     'offer', 'ai_match', now() - interval '24 days', now() - interval '20 days', 'interessado',
     now() - interval '25 days', now() - interval '6 days'),
    ('00000000-0000-4000-8003-000000000002', v_org_id, '00000000-0000-4000-8000-0000000000d5', p_aa,
     68, jsonb_build_object('preco', jsonb_build_object('points', 18, 'max', 30), 'bairro', jsonb_build_object('points', 15, 'max', 25), 'quartos', jsonb_build_object('points', 20, 'max', 20)),
     'viewed', 'ai_match', now() - interval '22 days', now() - interval '19 days', 'sem_interesse',
     now() - interval '23 days', now() - interval '19 days'),
    ('00000000-0000-4000-8003-000000000003', v_org_id, '00000000-0000-4000-8000-0000000000d6', p_ab,
     87, jsonb_build_object('preco', jsonb_build_object('points', 28, 'max', 30), 'localizacao', jsonb_build_object('points', 25, 'max', 25)),
     'visit_scheduled', 'ai_match', now() - interval '11 days', now() - interval '10 days', 'interessado',
     now() - interval '12 days', now() - interval '4 days'),
    ('00000000-0000-4000-8003-000000000004', v_org_id, '00000000-0000-4000-8000-0000000000d9', p_ac,
     55, jsonb_build_object('preco', jsonb_build_object('points', 20, 'max', 30), 'bairro', jsonb_build_object('points', 15, 'max', 25)),
     'suggested', 'ai_match', null, null, null,
     now() - interval '5 days', now() - interval '5 days')
  on conflict (deal_id, property_id) do nothing;

  -- Fase 3 (RE-3xx): visitas.
  insert into public.real_estate_visits (
    id, org_id, contact_id, deal_id, property_id, broker_id, scheduled_at, duration_minutes,
    status, confirmation_status, client_feedback, broker_notes, completed_at, created_at, updated_at
  ) values
    (v1, v_org_id, c1, '00000000-0000-4000-8000-0000000000d5', p_a1, v_user_id,
     now() - interval '18 days', 45, 'completed', 'confirmed',
     'Adorou a varanda e a luz da manhã, disse que era exatamente o que procurava.', null,
     now() - interval '18 days', now() - interval '20 days', now() - interval '18 days'),
    (v2, v_org_id, c4, '00000000-0000-4000-8000-0000000000d6', p_ab, v_user_id,
     now() - interval '10 days', 60, 'completed', 'confirmed',
     'Achou a localização ótima, vai avaliar com o sócio antes de propor.',
     'Levar detalhamento técnico das docas na próxima visita.',
     now() - interval '10 days', now() - interval '12 days', now() - interval '10 days'),
    (v3, v_org_id, c4, '00000000-0000-4000-8000-0000000000d6', p_ab, v_user_id,
     now() + interval '4 days', 60, 'scheduled', 'pending', null,
     'Visita técnica com o sócio dele - levar engenheiro se possível.',
     null, now() - interval '4 days', now() - interval '1 day'),
    (v4, v_org_id, c1, '00000000-0000-4000-8000-0000000000d9', p_ac, v_user_id,
     null, 45, 'requested', 'pending', null, null,
     null, now() - interval '5 days', now() - interval '5 days')
  on conflict (id) do nothing;

  -- Fase 4 (RE-4xx): propostas.
  insert into public.real_estate_offers (
    id, org_id, contact_id, deal_id, property_id, created_by, amount_cents,
    down_payment_cents, financing_amount_cents, payment_terms, conditions,
    expires_at, status, sent_at, responded_at, created_at, updated_at
  ) values
    (o1, v_org_id, c1, '00000000-0000-4000-8000-0000000000d5', p_a1, v_user_id, 85000000,
     25000000, 60000000, 'Financiamento bancário, entrada em até 30 dias', 'Sujeito a vistoria técnica.',
     now() + interval '8 days', 'sent', now() - interval '6 days', null,
     now() - interval '6 days', now() - interval '6 days'),
    (o2, v_org_id, c4, '00000000-0000-4000-8000-0000000000d6', p_ab, v_user_id, 300000000,
     null, null, null, 'Ainda em elaboração, aguardando validação do sócio dele sobre valor.',
     null, 'draft', null, null,
     now() - interval '2 days', now() - interval '2 days'),
    (o3, v_org_id, c6, '00000000-0000-4000-8000-0000000000d1', p_a6, v_user_id, 42000000,
     10000000, 32000000, 'Financiamento aprovado previamente pelo banco.', null,
     now() - interval '40 days', 'accepted', now() - interval '50 days', now() - interval '45 days',
     now() - interval '50 days', now() - interval '45 days')
  on conflict (id) do nothing;

  -- Fase 5 (RE-5xx): checklist documental.
  insert into public.real_estate_property_documents (
    id, org_id, property_id, document_type, status, notes, created_by, created_at, updated_at
  ) values
    ('00000000-0000-4000-8008-000000000001', v_org_id, p_a1, 'Matrícula atualizada', 'received', null, v_user_id, now() - interval '24 days', now() - interval '24 days'),
    ('00000000-0000-4000-8008-000000000002', v_org_id, p_a1, 'IPTU quitado', 'received', null, v_user_id, now() - interval '24 days', now() - interval '24 days'),
    ('00000000-0000-4000-8008-000000000003', v_org_id, p_a1, 'Certidão negativa de débitos condominiais', 'pending', 'Pendente com o síndico.', v_user_id, now() - interval '24 days', now() - interval '6 days'),
    ('00000000-0000-4000-8008-000000000004', v_org_id, p_ab, 'Matrícula atualizada', 'received', null, v_user_id, now() - interval '12 days', now() - interval '12 days'),
    ('00000000-0000-4000-8008-000000000005', v_org_id, p_ab, 'Habite-se', 'pending', 'Aguardando prefeitura de Cotia.', v_user_id, now() - interval '12 days', now() - interval '12 days'),
    ('00000000-0000-4000-8008-000000000006', v_org_id, p_a3, 'Escritura', 'waived', 'Ainda em nome do proprietário anterior, não se aplica por ora.', v_user_id, now() - interval '9 days', now() - interval '9 days')
  on conflict (id) do nothing;

  -- Fase 6 (RE-6xx): comissões (uma por atendimento já fechado) e metas.
  insert into public.real_estate_commissions (
    id, org_id, deal_id, property_id, broker_id, gross_sale_value_cents, commission_percent,
    expected_amount_cents, received_amount_cents, status, due_at, received_at, created_at, updated_at
  ) values
    ('00000000-0000-4000-8006-000000000001', v_org_id, '00000000-0000-4000-8000-0000000000d1', p_a6, v_user_id,
     42000000, 6.00, 2520000, 2520000, 'received', (now() - interval '40 days')::date, now() - interval '40 days',
     now() - interval '45 days', now() - interval '40 days'),
    ('00000000-0000-4000-8006-000000000002', v_org_id, '00000000-0000-4000-8000-0000000000d2', p_a7, v_user_id,
     51000000, 6.00, 3060000, 3060000, 'received', (now() - interval '15 days')::date, now() - interval '15 days',
     now() - interval '20 days', now() - interval '15 days'),
    ('00000000-0000-4000-8006-000000000003', v_org_id, '00000000-0000-4000-8000-0000000000d3', p_a8, v_user_id,
     260000, 100.00, 260000, 260000, 'received', (now() - interval '10 days')::date, now() - interval '10 days',
     now() - interval '15 days', now() - interval '10 days'),
    ('00000000-0000-4000-8006-000000000004', v_org_id, '00000000-0000-4000-8000-0000000000d4', p_a9, v_user_id,
     550000, 100.00, 550000, 0, 'expected', (now() - interval '2 days')::date, null,
     now() - interval '8 days', now() - interval '8 days')
  on conflict (id) do nothing;

  insert into public.real_estate_targets (id, org_id, broker_id, period_start, period_end, target_amount_cents, created_by, created_at)
  values
    ('00000000-0000-4000-8007-000000000001', v_org_id, null,
     date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date,
     50000000, v_user_id, now() - interval '13 days'),
    ('00000000-0000-4000-8007-000000000002', v_org_id, v_user_id,
     date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date,
     40000000, v_user_id, now() - interval '13 days')
  on conflict (id) do nothing;

  -- Fase 3 (RE-3xx): fila de eventos de domínio (auditoria) referente às
  -- automações que já rodaram nas visitas/propostas acima — mesmo princípio
  -- de record_property_reaction (0060), processado síncrono no momento em
  -- que o evento de origem aconteceu.
  insert into public.crm_domain_events (id, org_id, event_type, aggregate_type, aggregate_id, idempotency_key, payload, processed_at, created_at)
  values
    ('00000000-0000-4000-8009-000000000001', v_org_id, 'visit_requested', 'real_estate_visit', v4,
     'visit_requested:' || v4::text, jsonb_build_object('property_id', p_ac, 'deal_id', '00000000-0000-4000-8000-0000000000d9', 'via', 'manual'),
     now() - interval '5 days', now() - interval '5 days'),
    ('00000000-0000-4000-8009-000000000002', v_org_id, 'visit_completed', 'real_estate_visit', v1,
     'visit_completed:' || v1::text, jsonb_build_object('property_id', p_a1, 'deal_id', '00000000-0000-4000-8000-0000000000d5'),
     now() - interval '18 days', now() - interval '18 days'),
    ('00000000-0000-4000-8009-000000000003', v_org_id, 'offer_sent', 'real_estate_offer', o1,
     'offer_sent:' || o1::text, jsonb_build_object('property_id', p_a1, 'deal_id', '00000000-0000-4000-8000-0000000000d5', 'amount_cents', 85000000),
     now() - interval '6 days', now() - interval '6 days')
  on conflict (idempotency_key) do nothing;

  -- Contato de teste pra validar o opt-out de WhatsApp (item 3 da rede de
  -- seguranca): Juliana já fechou a locação, marcada como tendo pedido pra
  -- não receber mais mensagens automáticas.
  update public.contacts
  set whatsapp_opt_out = true, whatsapp_opt_out_at = now() - interval '9 days'
  where id = c3;
end $$;
