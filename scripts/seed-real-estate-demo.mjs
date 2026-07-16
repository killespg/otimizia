import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnvFile(join(process.cwd(), ".env.local"));
if (process.env.SEED_ENV_FILE) loadEnvFile(join(process.cwd(), process.env.SEED_ENV_FILE));

const AUTH_EMAIL = process.env.BROKER_DEMO_AUTH_EMAIL ?? "corretor.demo.otimizia@gmail.com";
const AUTH_PASSWORD = process.env.BROKER_DEMO_AUTH_PASSWORD ?? "OtimizIA-demo-corretor-2026!";
const WORKSPACE = "real_estate_broker";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Faltam URL e chave publica do Supabase em .env.local.");

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw new Error(`Nao foi possivel consultar a conta demo: ${usersError.message}`);
  const existingUser = usersPage.users.find((user) => user.email === AUTH_EMAIL);
  if (existingUser) {
    const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
      password: AUTH_PASSWORD,
      email_confirm: true,
      user_metadata: { ...existingUser.user_metadata, name: "Mariana Costa", profession_type: WORKSPACE, profession_types: [WORKSPACE] },
    });
    if (error) throw new Error(`Nao foi possivel confirmar a conta demo: ${error.message}`);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: AUTH_EMAIL, password: AUTH_PASSWORD, email_confirm: true,
      user_metadata: { name: "Mariana Costa", profession_type: WORKSPACE, profession_types: [WORKSPACE], terms_accepted: "true", trial_notice_accepted: "true" },
    });
    if (error) throw new Error(`Nao foi possivel criar a conta demo: ${error.message}`);
  }
}

const signIn = await supabase.auth.signInWithPassword({ email: AUTH_EMAIL, password: AUTH_PASSWORD });
let session = signIn.data.session;
if (!session) {
  const signUp = await supabase.auth.signUp({
    email: AUTH_EMAIL,
    password: AUTH_PASSWORD,
    options: {
      data: {
        name: "Mariana Costa",
        profession_type: WORKSPACE,
        profession_types: [WORKSPACE],
        terms_accepted: "true",
        trial_notice_accepted: "true",
      },
    },
  });
  if (signUp.error) throw new Error(`Nao foi possivel criar a conta demo: ${signUp.error.message}`);
  session = signUp.data.session;
}
if (!session) throw new Error("A conta foi criada, mas o projeto exige confirmacao de e-mail. Confirme-a e rode o seed novamente.");

const userId = session.user.id;
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("active_org_id")
  .eq("id", userId)
  .single();
if (profileError || !profile?.active_org_id) throw new Error(`Perfil demo incompleto: ${profileError?.message ?? "sem organizacao"}`);
const orgId = profile.active_org_id;

await must(supabase.from("profiles").update({
  name: "Mariana Costa",
  profession_type: WORKSPACE,
  profession_types: [WORKSPACE],
  dashboard_preferences: {
    style: "executive",
    accent: "violet",
    metrics: ["open_value", "open_deals", "won_count_month", "conversion_rate", "contacts", "overdue_tasks"],
    metricLabels: { open_value: "Carteira em negociacao", won_count_month: "Fechados no mes" },
    widgets: ["metrics", "calendar", "chart", "deals", "tasks", "assistant", "open_claims"],
  },
}).eq("id", userId), "atualizar perfil");

await must(supabase.from("organizations").update({
  name: "Mariana Costa Imoveis",
  industry: "Mercado imobiliario residencial e comercial",
  region: "Sao Paulo - Capital e Grande Sao Paulo",
  team_size: "1 corretora",
  website: "https://marianacostaimoveis.example.com",
  business_context: "Imobiliaria boutique focada em compra, venda e locacao de imoveis residenciais de medio e alto padrao. Atendimento consultivo para compradores, investidores e proprietarios.",
  business_priorities: "Responder leads em ate 30 minutos, aumentar visitas qualificadas, manter proprietarios atualizados e converter propostas com acompanhamento semanal.",
  ai_tone: "Consultivo, objetivo, acolhedor e profissional. Portugues do Brasil, sem excesso de formalidade.",
  ai_instructions: "Priorize orcamento, bairro, prazo de mudanca, forma de pagamento e proximo passo. Nunca prometa aprovacao de financiamento. Sugira follow-up quando um atendimento estiver parado.",
  extra_notes: "Horario de atendimento: segunda a sabado, das 8h30 as 19h. Parcerias com correspondentes bancarios e fotografos imobiliarios.",
  onboarded_at: iso("2026-01-08T13:00:00Z"),
  workspace_preferences: { [WORKSPACE]: { labels: { contacts: "Leads e clientes", pipeline: "Atendimentos", value: "Valor dos imoveis", followups: "Retornos e visitas", dealSingular: "atendimento" } } },
}).eq("id", orgId), "atualizar organizacao");

// A conta e exclusiva para demonstracao: uma nova execucao recompõe o mesmo
// cenario em vez de acumular copias dos registros.
for (const table of ["real_estate_share_collections", "real_estate_properties", "interactions", "tasks", "deals", "contacts"]) {
  await must(supabase.from(table).delete().eq("org_id", orgId).eq("workspace_key", WORKSPACE), `limpar ${table}`);
}

const contactSeeds = [
  ["Ana Paula Ribeiro", "Comprador", "ate R$ 850 mil", "Vila Mariana", "Instagram", "Procura 3 dormitorios, varanda e metro perto."],
  ["Bruno Martins", "Comprador", "ate R$ 1,2 milhao", "Moema", "Indicacao", "Casal com um filho; aceita reformado."],
  ["Carla Nogueira", "Proprietario", "R$ 980 mil", "Pinheiros", "Site", "Quer vender em ate 90 dias; apartamento ocupado."],
  ["Daniel Souza", "Locatario", "ate R$ 4.500/mes", "Brooklin", "Google", "Mudanca prevista para agosto; tem pet."],
  ["Eduarda Lima", "Comprador", "ate R$ 650 mil", "Saude", "Portais", "Primeiro imovel; depende de financiamento."],
  ["Felipe Andrade", "Vendedor", "R$ 1,45 milhao", "Perdizes", "Indicacao", "Ja possui avaliacao anterior."],
  ["Gabriela Rocha", "Comprador", "ate R$ 2,1 milhoes", "Itaim Bibi", "Instagram", "Investidora, prefere pronto para locacao."],
  ["Henrique Alves", "Proprietario", "R$ 720 mil", "Tatuape", "Evento", "Imovel vazio e documentacao em ordem."],
  ["Isabela Freitas", "Comprador", "ate R$ 900 mil", "Aclimacao", "Indicacao", "Quer escritorio e duas vagas."],
  ["Joao Pedro Mendes", "Locatario", "ate R$ 6.000/mes", "Vila Olimpia", "Site", "Executivo transferido para Sao Paulo."],
  ["Karina Azevedo", "Comprador", "ate R$ 780 mil", "Santana", "WhatsApp", "Busca condominio com lazer completo."],
  ["Lucas Ferreira", "Proprietario", "R$ 540 mil", "Cambuci", "Google", "Precisa de fotos e avaliacao comercial."],
  ["Marcia Teixeira", "Comprador", "ate R$ 1,6 milhao", "Alto de Pinheiros", "Indicacao", "Familia com dois filhos e cachorro."],
  ["Nelson Barros", "Vendedor", "R$ 3,2 milhoes", "Jardins", "Networking", "Cobertura; atendimento discreto."],
  ["Olivia Campos", "Comprador", "ate R$ 1,05 milhao", "Pompeia", "Instagram", "Quer varanda gourmet e sol da manha."],
  ["Paulo Cesar Dias", "Locatario", "ate R$ 3.800/mes", "Bela Vista", "Portais", "Prefere mobiliado e contrato de 30 meses."],
  ["Renata Moraes", "Proprietario", "R$ 860 mil", "Vila Madalena", "Indicacao", "Considera venda ou locacao."],
  ["Sergio Farias", "Comprador", "ate R$ 480 mil", "Butanta", "Feirao", "Entrada de R$ 120 mil, FGTS disponivel."],
  ["Tatiane Lopes", "Comprador", "ate R$ 1,35 milhao", "Campo Belo", "Site", "Visita somente aos sabados."],
  ["Vinicius Cardoso", "Investidor", "ate R$ 2,5 milhoes", "Centro", "Networking", "Busca salas e studios para renda."],
  ["Amanda Vieira", "Locatario", "ate R$ 5.200/mes", "Pinheiros", "Instagram", "Precisa entrar em setembro."],
  ["Caio Pires", "Comprador", "ate R$ 700 mil", "Ipiranga", "Google", "Proximo ao metro, 2 dormitorios."],
  ["Debora Salles", "Proprietario", "R$ 1,1 milhao", "Mooca", "Indicacao", "Casa de familia; inventario concluido."],
  ["Erick Monteiro", "Comprador", "ate R$ 920 mil", "Lapa", "Portais", "Ja tem credito pre-aprovado."],
  ["Fernanda Luz", "Comprador", "ate R$ 1,8 milhao", "Chacara Flora", "Evento", "Procura casa em condominio."],
  ["Gustavo Reis", "Vendedor", "R$ 690 mil", "Vila Prudente", "Site", "Mudanca de cidade em outubro."],
  ["Helena Duarte", "Comprador", "ate R$ 560 mil", "Consolacao", "Instagram", "Studio para filha universitária."],
  ["Igor Batista", "Locatario", "ate R$ 7.000/mes", "Itaim Bibi", "Indicacao", "Contrato corporativo."],
  ["Juliana Paes", "Comprador", "ate R$ 1,0 milhao", "Paraiso", "WhatsApp", "Quer predio novo e academia."],
  ["Leandro Cunha", "Proprietario", "R$ 2,4 milhoes", "Morumbi", "Networking", "Casa com piscina; aceita permuta parcial."],
  ["Monica Assis", "Comprador", "ate R$ 740 mil", "Vila Clementino", "Site", "Profissional da saude; perto do hospital."],
  ["Otavio Prado", "Investidor", "ate R$ 4 milhoes", "Zona Oeste", "Indicacao", "Analisa terrenos e retrofit."],
  ["Patricia Gomes", "Locatario", "ate R$ 4.200/mes", "Sumare", "Google", "Mora sozinha e trabalha em home office."],
  ["Rafael Tavares", "Comprador", "ate R$ 1,25 milhao", "Vila Mariana", "Instagram", "Casamento marcado para dezembro."],
  ["Simone Leal", "Proprietario", "R$ 830 mil", "Saude", "Indicacao", "Exclusividade assinada por 90 dias."],
  ["Thiago Neves", "Comprador", "ate R$ 620 mil", "Tatuape", "Feirao", "Financiamento e FGTS."],
  ["Valeria Costa", "Comprador", "ate R$ 1,7 milhao", "Perdizes", "Site", "Deseja 4 dormitorios ou 3 com escritorio."],
  ["William Ramos", "Locatario", "ate R$ 3.500/mes", "Liberdade", "Portais", "Estudante de pos-graduacao."],
  ["Yasmin Moreira", "Comprador", "ate R$ 880 mil", "Brooklin", "Instagram", "Aceita lancamento com entrega em 2027."],
  ["Roberto Albuquerque", "Proprietario", "R$ 1,9 milhao", "Campo Belo", "Networking", "Apartamento reformado, chave com porteiro."],
];

const contactsPayload = contactSeeds.map((c, i) => ({
  owner_id: userId, org_id: orgId, workspace_key: WORKSPACE,
  name: c[0], phone: `+55 11 9${String(31000000 + i * 791).padStart(8, "0")}`,
  email: `${slug(c[0])}@example.com`, instagram: `@${slug(c[0]).replaceAll(".", "")}`,
  company: ["Autonomo", "Empresa familiar", "Executivo", "Investidor"][i % 4], source: c[4], notes: c[5],
  details: { perfil_lead: c[1], orcamento: c[2], bairro: c[3] }, created_at: iso(monthDate(i)),
}));
const contacts = await insert("contacts", contactsPayload, "inserir contatos");

const stages = ["novo", "em_contato", "negociacao", "ganho", "perdido"];
const dealPayload = contacts.slice(0, 34).map((contact, i) => {
  const stage = stages[[0,1,2,3,3,4,1,2,3,0,2,3,4,1,3,2,0,4,3,1,2,3,0,1,4,2,3,1,0,3,2,4,1,2][i]];
  const created = new Date(monthDate(i + 4));
  const closed = ["ganho", "perdido"].includes(stage) ? new Date(created.getTime() + (12 + (i % 28)) * 86400000) : null;
  const type = ["Apartamento", "Casa", "Terreno", "Comercial", "Apartamento"][i % 5];
  return {
    owner_id: userId, org_id: orgId, workspace_key: WORKSPACE, contact_id: contact.id, assignee_id: userId,
    title: `${type} em ${contact.details.bairro} - ${contact.name.split(" ")[0]}`,
    value_cents: [48000000, 65000000, 78000000, 92000000, 110000000, 145000000, 210000000][i % 7],
    stage, position: i, details: { tipo_imovel: type }, created_at: created.toISOString(), closed_at: closed?.toISOString() ?? null,
  };
});
const deals = await insert("deals", dealPayload, "inserir atendimentos");

const interactionBodies = [
  "Lead respondeu ao primeiro contato e confirmou faixa de orcamento.",
  "Enviei uma selecao com tres imoveis aderentes ao perfil.",
  "Ligacao de qualificacao: prazo, bairros e forma de pagamento alinhados.",
  "Visita realizada. Gostou da planta, mas pediu comparativo de condominio.",
  "Proprietario atualizado sobre acessos ao anuncio e feedbacks recebidos.",
  "Documentacao inicial recebida e encaminhada para conferencia.",
  "Simulacao de financiamento enviada pelo correspondente bancario.",
  "Cliente pediu retorno na proxima semana apos conversar com a familia.",
];
const interactionsPayload = [];
contacts.slice(0, 36).forEach((contact, i) => {
  const count = 2 + (i % 3);
  for (let n = 0; n < count; n++) interactionsPayload.push({
    owner_id: userId, org_id: orgId, workspace_key: WORKSPACE, contact_id: contact.id,
    body: interactionBodies[(i + n) % interactionBodies.length],
    created_at: new Date(new Date(contact.created_at).getTime() + (n + 1) * (3 + i % 5) * 86400000).toISOString(),
  });
});
await insert("interactions", interactionsPayload, "inserir historico de conversas");

const today = new Date();
const taskPayload = deals.slice(0, 30).map((deal, i) => {
  const done = i < 15;
  const due = done
    ? new Date(new Date(deal.created_at).getTime() + (4 + i % 8) * 86400000)
    : new Date(today.getTime() + (i % 7 - 2) * 86400000 + 14 * 3600000);
  return {
    owner_id: userId, org_id: orgId, workspace_key: WORKSPACE, assignee_id: userId,
    contact_id: deal.contact_id, deal_id: deal.id,
    title: ["Confirmar interesse e proximo passo", "Enviar novas opcoes", "Confirmar visita", "Cobrar documentos", "Atualizar proprietario", "Revisar proposta"][i % 6],
    due_at: due.toISOString(), done, recurrence: i === 17 ? "weekly" : "none", recurrence_spawned: false,
    created_at: new Date(due.getTime() - 2 * 86400000).toISOString(),
  };
});
await insert("tasks", taskPayload, "inserir tarefas");

const propertySeeds = [
  ["Apartamento com varanda perto do metro", "apartamento", "venda", "ativo", 78500000, null, 92000, 31000, 3, 2, 1, 86, "Rua Domingos de Morais", "1840", "Vila Mariana", "04010-200", "Varanda gourmet, cozinha integrada e condominio com academia."],
  ["Studio mobiliado para renda", "apartamento", "venda_aluguel", "ativo", 49500000, 340000, 61000, 18000, 1, 1, 1, 38, "Rua dos Pinheiros", "921", "Pinheiros", "05422-011", "Mobiliado, proximo ao metro e pronto para locacao."],
  ["Casa reformada com jardim", "casa", "venda", "reservado", 168000000, null, null, 54000, 4, 4, 3, 245, "Rua Cardoso de Almeida", "1470", "Perdizes", "05013-001", "Casa iluminada, escritorio, jardim e espaco gourmet."],
  ["Cobertura duplex com vista", "cobertura", "venda", "ativo", 320000000, null, 260000, 98000, 4, 5, 4, 310, "Alameda Santos", "2180", "Jardins", "01418-200", "Piscina privativa, vista livre e quatro suites."],
  ["Apartamento familiar com lazer completo", "apartamento", "venda", "vendido", 112000000, null, 135000, 42000, 3, 3, 2, 118, "Rua Arizona", "755", "Brooklin", "04567-002", "Condominio clube, andar alto e varanda envidracada."],
  ["Sala comercial pronta para uso", "sala", "venda_aluguel", "ativo", 62000000, 420000, 98000, 26000, 0, 2, 2, 72, "Avenida Paulista", "171", "Bela Vista", "01311-000", "Recepcao, duas salas, copa e ar-condicionado."],
  ["Terreno para incorporacao", "terreno", "venda", "ativo", 240000000, null, null, 89000, 0, 0, 0, 520, "Rua Tito", "880", "Lapa", "05051-000", "Zoneamento favoravel e frente de 16 metros."],
  ["Apartamento compacto proximo ao parque", "apartamento", "venda", "ativo", 73500000, null, 87000, 25000, 2, 2, 1, 64, "Rua Cayowaá", "1320", "Sumare", "01258-010", "Planta funcional, sol da manha e rua tranquila."],
  ["Casa em condominio com piscina", "casa", "venda", "ativo", 195000000, null, 165000, 67000, 4, 5, 4, 330, "Rua Visconde de Porto Seguro", "2890", "Chacara Flora", "04642-005", "Condominio fechado, piscina aquecida e espaco gourmet."],
  ["Apartamento novo com duas suites", "apartamento", "venda", "reservado", 98000000, null, 110000, 36000, 2, 3, 2, 92, "Rua Afonso Celso", "640", "Vila Mariana", "04119-060", "Predio novo, duas suites e varanda integrada."],
  ["Loja de esquina com alto fluxo", "comercial", "aluguel", "ativo", null, 1250000, null, 76000, 0, 2, 0, 145, "Rua Tuiuti", "1680", "Tatuape", "03307-000", "Fachada ampla, pe-direito alto e excelente visibilidade."],
  ["Apartamento classico com planta ampla", "apartamento", "venda", "inativo", 138000000, null, 185000, 49000, 3, 3, 2, 156, "Rua Bahia", "720", "Higienopolis", "01244-000", "Ambientes amplos; proprietario pausou as visitas."],
  ["Studio novo ao lado da universidade", "apartamento", "aluguel", "alugado", null, 290000, 54000, 12000, 1, 1, 0, 29, "Rua Maria Antonia", "310", "Consolacao", "01222-010", "Studio com marcenaria, lavanderia coletiva e coworking."],
  ["Galpao logistico com acesso a marginal", "galpao", "aluguel", "ativo", null, 2800000, null, 210000, 0, 4, 8, 980, "Avenida Queiroz Filho", "1880", "Vila Leopoldina", "05319-000", "Docas, patio de manobra e escritorio administrativo."],
  ["Apartamento com vista para o parque", "apartamento", "venda", "ativo", 178000000, null, 198000, 63000, 3, 4, 3, 165, "Avenida Republica do Libano", "1040", "Moema", "04802-001", "Vista permanente, tres suites e elevador privativo."],
  ["Casa terrea para modernizar", "casa", "venda", "rascunho", 89000000, null, null, 33000, 3, 2, 2, 190, "Rua dos Macunis", "470", "Vila Madalena", "05444-000", "Bom terreno e potencial de reforma; fotos pendentes."],
  ["Apartamento ensolarado com home office", "apartamento", "venda", "vendido", 84500000, null, 99000, 28000, 2, 2, 1, 78, "Rua Vergueiro", "4020", "Saude", "04102-001", "Reformado, escritorio isolado e proximo ao metro."],
  ["Conjunto comercial corporativo", "comercial", "venda", "ativo", 135000000, null, 240000, 52000, 0, 4, 4, 210, "Avenida Brigadeiro Faria Lima", "1656", "Itaim Bibi", "01451-001", "Andar alto, quatro salas e infraestrutura de dados."],
];
const properties = await insert("real_estate_properties", propertySeeds.map((p, i) => ({
  org_id: orgId, workspace_key: WORKSPACE, created_by: userId, assignee_id: userId,
  title: p[0], property_type: p[1], transaction_type: p[2], status: p[3], price_cents: p[4], rent_price_cents: p[5], condo_fee_cents: p[6], iptu_cents: p[7],
  bedrooms: p[8], bathrooms: p[9], parking_spots: p[10], area_m2: p[11], address_street: p[12], address_number: p[13], address_neighborhood: p[14], address_city: "Sao Paulo", address_state: "SP", address_zip: p[15],
  description: p[16], extra_features: { destaque: ["varanda", "metro", "investimento", "lazer", "home_office"][i % 5], captacao: i % 3 === 0 ? "exclusiva" : "parceria" },
  ai_suggested_fields: i === 15 ? { parking_spots: { value: "2", source: "assistant", confidence: 0.72, suggested_at: new Date().toISOString() } } : {},
  created_at: iso(monthDate(i + 2)), updated_at: new Date().toISOString(),
})), "inserir imoveis");

const collectionSpecs = [
  ["Opcoes para Ana - Vila Mariana", 0, [0, 7, 9], ["interessado", "sem_interesse", "quero_visitar"]],
  ["Imoveis para investimento - Gabriela", 6, [1, 5, 12, 17], ["quero_visitar", "interessado", "sem_interesse", "interessado"]],
  ["Casas para Marcia e familia", 12, [2, 8, 15], ["interessado", "quero_visitar", "sem_interesse"]],
  ["Selecao Campo Belo e Brooklin", 18, [4, 9, 14], ["interessado", "quero_visitar", "interessado"]],
];
for (let i = 0; i < collectionSpecs.length; i++) {
  const spec = collectionSpecs[i];
  const [collection] = await insert("real_estate_share_collections", [{
    org_id: orgId, workspace_key: WORKSPACE, created_by: userId, title: spec[0], client_contact_id: contacts[spec[1]].id,
    view_count: 3 + i * 4, last_accessed_at: new Date(Date.now() - i * 86400000).toISOString(), expires_at: new Date(Date.now() + (30 + i * 7) * 86400000).toISOString(), created_at: iso(monthDate(i + 20)),
  }], "inserir colecao");
  await insert("real_estate_share_collection_items", spec[2].map((propertyIndex, position) => ({ collection_id: collection.id, org_id: orgId, property_id: properties[propertyIndex].id, position })), "inserir itens da colecao");
  for (let position = 0; position < spec[2].length; position++) {
    await must(supabase.rpc("record_property_reaction", {
      p_token: collection.token,
      p_property_id: properties[spec[2][position]].id,
      p_reaction: spec[3][position],
    }), "inserir reacao");
  }
}

const summary = {
  login: "corretor@corretor", senha: "1", contatos: contacts.length, atendimentos: deals.length,
  interacoes: interactionsPayload.length, tarefas: taskPayload.length, imoveis: properties.length, colecoes: collectionSpecs.length,
};
console.log(JSON.stringify(summary, null, 2));

async function insert(table, rows, label) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

async function must(query, label) {
  const { error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
}

function monthDate(index) {
  const month = index % 7;
  const day = 4 + ((index * 5) % 23);
  return new Date(Date.UTC(2026, month, day, 12 + (index % 7), 0, 0));
}

function iso(value) { return new Date(value).toISOString(); }
function slug(value) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, ""); }

function loadEnvFile(path) {
  let content;
  try { content = readFileSync(path, "utf8"); } catch { return; }
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(name in process.env)) process.env[name] = value;
  }
}
