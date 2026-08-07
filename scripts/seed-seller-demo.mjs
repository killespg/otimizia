/**
 * Conta de demonstração do vendedor autônomo.
 *
 * Mesma forma do `seed-real-estate-demo.mjs`: a conta é exclusiva para demo e
 * cada execução recompõe o mesmo cenário em vez de acumular cópias. O que muda
 * é o domínio — aqui o CRM (clientes, funil, lembretes) convive com a operação
 * de produto: catálogo com variações, estoque, pedidos, garantias e chamados de
 * pós-venda. O objetivo é que nenhuma tela do vendedor abra vazia.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnvFile(join(process.cwd(), ".env.local"));
if (process.env.SEED_ENV_FILE) loadEnvFile(join(process.cwd(), process.env.SEED_ENV_FILE));

const AUTH_EMAIL = process.env.SELLER_DEMO_AUTH_EMAIL ?? "vendedor.demo.otimizia@gmail.com";
// Sem valor padrão: este arquivo é versionado e o script tem poder de definir a
// senha de uma conta no banco real.
const AUTH_PASSWORD = process.env.SELLER_DEMO_AUTH_PASSWORD;
if (!AUTH_PASSWORD) {
  throw new Error("Defina SELLER_DEMO_AUTH_PASSWORD em .env.local antes de rodar o seed.");
}
const WORKSPACE = "autonomous_seller";
const PERSON = "Rafael Nunes";
const BUSINESS = "Nunes Distribuidora";
// CPF fictício com dígitos verificadores válidos — passa na checagem do produto
// sem corresponder a pessoa nenhuma.
const DEMO_CPF = "52998224725";
const HOJE = new Date();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Faltam URL e chave pública do Supabase em .env.local.");

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const metadata = { name: PERSON, profession_type: WORKSPACE, profession_types: [WORKSPACE], terms_accepted: "true", trial_notice_accepted: "true" };

  // Tenta criar primeiro e só procura a conta existente se o e-mail já estiver
  // em uso. Listar usuários seria o caminho óbvio, mas `admin.listUsers` devolve
  // 500 neste projeto a partir do quarto registro; o id sai do próprio perfil,
  // que a service role lê sem passar pela API de auth.
  const criacao = await admin.auth.admin.createUser({
    email: AUTH_EMAIL,
    password: AUTH_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (criacao.error) {
    const jaExiste = /already been registered|already exists|duplicate/i.test(criacao.error.message);
    if (!jaExiste) throw new Error(`Não foi possível criar a conta demo: ${criacao.error.message}`);

    const { data: existente, error: buscaError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", AUTH_EMAIL)
      .maybeSingle();
    if (buscaError) throw new Error(`Não foi possível localizar a conta demo: ${buscaError.message}`);
    if (!existente?.id) throw new Error(`A conta ${AUTH_EMAIL} existe no auth mas não tem perfil. Verifique antes de rodar o seed.`);

    const { error } = await admin.auth.admin.updateUserById(existente.id, {
      password: AUTH_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw new Error(`Não foi possível atualizar a conta demo: ${error.message}`);
  }
}

const signIn = await supabase.auth.signInWithPassword({ email: AUTH_EMAIL, password: AUTH_PASSWORD });
if (!signIn.data.session) throw new Error(`Não foi possível entrar na conta demo: ${signIn.error?.message ?? "sem sessão"}`);
const userId = signIn.data.session.user.id;

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("active_org_id")
  .eq("id", userId)
  .single();
if (profileError || !profile?.active_org_id) throw new Error(`Perfil demo incompleto: ${profileError?.message ?? "sem organização"}`);
const orgId = profile.active_org_id;

await must(supabase.from("profiles").update({
  name: PERSON,
  profession_type: WORKSPACE,
  profession_types: [WORKSPACE],
  dashboard_preferences: {
    [WORKSPACE]: {
      metrics: ["open_value", "won_value_month", "conversion_rate", "commission_open", "avg_ticket", "overdue_tasks"],
      metricLabels: { open_value: "Potencial em aberto", won_value_month: "Vendido no mês" },
      widgets: ["onboarding", "tasks", "open_claims", "calendar", "deals", "metrics", "chart", "assistant"],
      showAnimatedBackground: false,
      salesMarketingCostCents: 180000,
    },
  },
}).eq("id", userId), "atualizar perfil");

// CPF e aceite de termos sao colunas travadas pra o cliente desde a 0072, e sem
// CPF a conta cai na tela /onboarding/cpf antes de qualquer pagina do painel.
// A 0078 criou a RPC exata para isso, que escreve so na propria linha.
await must(supabase.rpc("complete_oauth_profile", {
  p_cpf: DEMO_CPF,
  p_profession_types: [WORKSPACE],
}), "liberar o cadastro da conta demo");

await must(supabase.from("organizations").update({
  name: BUSINESS,
  industry: "Distribuição de eletroportáteis, utilidades domésticas e acessórios",
  region: "Campinas e interior de São Paulo",
  team_size: "1 vendedor autônomo",
  website: "https://nunesdistribuidora.example.com",
  business_context: "Venda direta de eletroportáteis, utilidades para casa e acessórios. Atende consumidor final por WhatsApp e pequenos lojistas que revendem. Entrega própria na região de Campinas e transportadora para o interior.",
  business_priorities: "Responder orçamento no mesmo dia, não deixar pedido confirmado parado sem separar, manter estoque dos campeões de venda e acompanhar garantia antes de vencer.",
  ai_tone: "Direto, prestativo e informal na medida. Português do Brasil, sem juridiquês e sem exagero de formalidade.",
  ai_instructions: "Priorize quantidade, prazo de entrega, forma de pagamento e próximo passo. Confira estoque antes de prometer prazo. Avise quando um pedido confirmado estiver parado há mais de dois dias e quando uma garantia estiver perto de vencer.",
  extra_notes: "Atendimento de segunda a sexta das 8h às 18h e sábado até 13h. Entrega própria às terças e quintas; transportadora sai às sextas.",
  onboarded_at: iso("2026-01-15T13:00:00Z"),
  workspace_preferences: {
    [WORKSPACE]: {
      labels: { contacts: "Clientes", pipeline: "Funil de vendas", value: "Valor da venda", followups: "Retornos", dealSingular: "venda" },
    },
  },
}).eq("id", orgId), "atualizar organização");

await must(supabase.from("seller_business_profiles").upsert({
  org_id: orgId,
  workspace_key: WORKSPACE,
  sales_models: ["general", "durable", "fashion"],
  enabled_modules: ["catalog", "collections", "variants", "inventory", "orders", "warranties", "commissions", "delivery"],
  default_warranty_days: 365,
  low_stock_threshold: 5,
  allow_negative_stock: false,
}, { onConflict: "org_id,workspace_key" }), "configurar operação");

// Ordem de limpeza segue as dependências: chamados antes de garantias, itens
// antes de pedidos, e o CRM por último.
for (const table of [
  "seller_warranty_claims",
  "seller_warranties",
  "seller_order_items",
  "seller_orders",
  "seller_inventory_movements",
  "seller_product_variants",
  "seller_products",
  "seller_collections",
  "seller_customer_profiles",
]) {
  await must(supabase.from(table).delete().eq("org_id", orgId), `limpar ${table}`);
}
for (const table of ["interactions", "tasks", "deals", "contacts"]) {
  await must(supabase.from(table).delete().eq("org_id", orgId).eq("workspace_key", WORKSPACE), `limpar ${table}`);
}

// --- Clientes -------------------------------------------------------------
const contactSeeds = [
  ["Adriana Vasques", "Consumidor final", "Air fryer e panela elétrica", "WhatsApp", "Comprou air fryer em março; sempre pergunta por promoção."],
  ["Bruno Sampaio", "Lojista", "Revenda de eletroportáteis", "Indicação", "Compra em lotes de 10 a 20 peças; paga em 30 dias."],
  ["Camila Bertoldi", "Consumidor final", "Enxoval de cozinha", "Instagram", "Casamento em novembro; monta lista aos poucos."],
  ["Diego Ramalho", "Lojista", "Utilidades domésticas", "Feira", "Loja no centro de Sumaré; prefere entrega às terças."],
  ["Elaine Prado", "Consumidor final", "Aspirador vertical", "Google", "Tem dois cachorros; pediu comparativo de potência."],
  ["Fábio Toledo", "Lojista", "Acessórios e presentes", "Indicação", "Pede sempre nota fiscal antecipada."],
  ["Giovana Marques", "Consumidor final", "Cafeteira", "Instagram", "Presente de aniversário; queria embalagem."],
  ["Henrique Salles", "Lojista", "Eletroportáteis", "Networking", "Maior ticket da carteira; negocia desconto por volume."],
  ["Isadora Bueno", "Consumidor final", "Liquidificador e batedeira", "WhatsApp", "Confeiteira; usa equipamento todo dia."],
  ["Jonas Peixoto", "Consumidor final", "Ventilador de coluna", "Portal", "Comprou três no verão passado."],
  ["Karen Odorico", "Lojista", "Moda casa e tapetes", "Instagram", "Só compra coleção nova; recusa saldo."],
  ["Leonardo Bittar", "Consumidor final", "Grill elétrico", "Indicação", "Pediu para avisar quando voltar o modelo grande."],
  ["Mariane Fontes", "Consumidor final", "Organizadores", "Instagram", "Segue o perfil e comenta todo lançamento."],
  ["Nicolas Rangel", "Lojista", "Revenda geral", "Feira", "Cidade vizinha; sempre por transportadora."],
  ["Otávia Munhoz", "Consumidor final", "Panela de pressão elétrica", "WhatsApp", "Trocou por defeito em abril; ficou satisfeita."],
  ["Paulo Renato Simas", "Lojista", "Eletroportáteis", "Indicação", "Paga à vista com desconto."],
  ["Queila Amorim", "Consumidor final", "Sanduicheira", "Google", "Primeiro contato pelo site."],
  ["Rodrigo Bastos", "Consumidor final", "Churrasqueira elétrica", "Indicação", "Mora em apartamento; precisa de modelo sem fumaça."],
  ["Sabrina Klein", "Lojista", "Presentes corporativos", "Networking", "Compra grande em novembro e dezembro."],
  ["Tomás Vilela", "Consumidor final", "Purificador de água", "Portal", "Perguntou sobre troca de refil."],
  ["Ubirajara Lopes", "Consumidor final", "Ferro de passar", "WhatsApp", "Cliente antigo, compra pouco mas sempre volta."],
  ["Vanessa Corrêa", "Consumidor final", "Kit cozinha completo", "Instagram", "Mudou de casa em julho."],
  ["Wagner Pontes", "Lojista", "Utilidades", "Feira", "Negocia bem; pediu tabela de preço atualizada."],
  ["Ximena Duarte", "Consumidor final", "Espremedor e mixer", "Google", "Nutricionista; indica para pacientes."],
  ["Yara Nogueira", "Consumidor final", "Robô aspirador", "Instagram", "Ticket alto; comparou com concorrente."],
  ["Zeca Portela", "Lojista", "Revenda geral", "Indicação", "Combina retirada no depósito."],
  ["Alice Vergara", "Consumidor final", "Máquina de café espresso", "Portal", "Pesquisou muito antes de comprar."],
  ["Benedito Farias", "Consumidor final", "Ventilador de teto", "WhatsApp", "Pediu instalação; indiquei eletricista."],
  ["Cíntia Marcondes", "Lojista", "Moda casa", "Instagram", "Trabalha com decoração; compra coleção inteira."],
  ["Douglas Ferrari", "Consumidor final", "Fritadeira elétrica", "Google", "Comprou pelo preço; sensível a frete."],
  ["Estela Rondon", "Consumidor final", "Batedeira planetária", "Indicação", "Fez bolo de casamento com o equipamento."],
  ["Fernando Bicudo", "Lojista", "Eletroportáteis", "Networking", "Novo na carteira; primeiro pedido teste."],
  ["Graziela Antunes", "Consumidor final", "Panelas antiaderentes", "Instagram", "Quer jogo completo, pode parcelar."],
  ["Hélio Trindade", "Consumidor final", "Aquecedor", "Portal", "Compra sazonal, sempre em maio."],
  ["Ivone Castilho", "Lojista", "Presentes", "Feira", "Loja de shopping; exige embalagem impecável."],
  ["Júlio Meireles", "Consumidor final", "Chaleira elétrica", "WhatsApp", "Pequeno ticket, alta recorrência."],
];

const contactsPayload = contactSeeds.map((c, i) => ({
  owner_id: userId,
  org_id: orgId,
  workspace_key: WORKSPACE,
  name: c[0],
  phone: `+55 19 9${String(41000000 + i * 673).padStart(8, "0")}`,
  email: `${slug(c[0])}@example.com`,
  instagram: `@${slug(c[0]).replaceAll(".", "")}`,
  // Consumidor final não tem empresa: preencher com um rótulo faz o painel
  // repetir "Consumidor final" onde deveria mostrar o nome de quem compra.
  company: c[1] === "Lojista" ? `${c[0].split(" ")[0]} Comércio` : null,
  source: c[3],
  notes: c[4],
  details: { perfil_cliente: c[1], produto_interesse: c[2] },
  created_at: iso(monthDate(i)),
}));
const contacts = await insert("contacts", contactsPayload, "inserir clientes");
const lojistas = contacts.filter((c) => c.details.perfil_cliente === "Lojista");

// --- Funil ----------------------------------------------------------------
const stageOrder = [0, 1, 2, 3, 3, 4, 1, 2, 3, 0, 2, 3, 4, 1, 3, 2, 0, 4, 3, 1, 2, 3, 0, 1, 4, 2, 3, 1, 0, 3];
const stages = ["novo", "em_contato", "negociacao", "ganho", "perdido"];
const proximoPasso = [
  "Enviar orçamento pelo WhatsApp",
  "Confirmar quantidade e prazo",
  "Aguardando resposta do cliente",
  "Separar e faturar",
  "Retomar em 30 dias",
];
const dealPayload = contacts.slice(0, 30).map((contact, i) => {
  const stage = stages[stageOrder[i]];
  const created = new Date(monthDate(i + 4));
  const closed = ["ganho", "perdido"].includes(stage) ? new Date(created.getTime() + (6 + (i % 21)) * 86400000) : null;
  const foco = contact.details.produto_interesse;
  return {
    owner_id: userId,
    org_id: orgId,
    workspace_key: WORKSPACE,
    contact_id: contact.id,
    assignee_id: userId,
    title: `${foco} — ${contact.name.split(" ")[0]}`,
    value_cents: [49900, 89900, 134900, 199000, 274000, 425000, 899000][i % 7] * (contact.details.perfil_cliente === "Lojista" ? 12 : 1),
    stage,
    position: i,
    details: { proximo_passo: proximoPasso[stageOrder[i]] },
    created_at: created.toISOString(),
    closed_at: closed?.toISOString() ?? null,
  };
});
const deals = await insert("deals", dealPayload, "inserir vendas");
const dealsGanhos = deals.filter((d) => d.stage === "ganho");

// --- Conversas ------------------------------------------------------------
const interactionBodies = [
  "Cliente pediu orçamento pelo WhatsApp e mandou a lista do que precisa.",
  "Enviei tabela de preço com as condições de pagamento.",
  "Confirmou a quantidade, mas pediu para segurar até receber o salário.",
  "Liguei para conferir se o modelo atende; encaixou no que ele queria.",
  "Mandei foto do produto na embalagem, do jeito que sai para entrega.",
  "Cliente perguntou sobre garantia e prazo de troca.",
  "Combinei a entrega para a próxima terça, no período da manhã.",
  "Pediu para incluir mais uma peça no mesmo pedido.",
  "Avisei que o item voltou ao estoque; ele pediu para separar.",
  "Fechado. Pagamento no pix, com desconto combinado.",
];
const interactionsPayload = [];
contacts.slice(0, 32).forEach((contact, i) => {
  const count = 2 + (i % 3);
  for (let n = 0; n < count; n++) {
    interactionsPayload.push({
      owner_id: userId,
      org_id: orgId,
      workspace_key: WORKSPACE,
      contact_id: contact.id,
      body: interactionBodies[(i + n) % interactionBodies.length],
      created_at: new Date(new Date(contact.created_at).getTime() + (n + 1) * (3 + (i % 5)) * 86400000).toISOString(),
    });
  }
});
await insert("interactions", interactionsPayload, "inserir conversas");

// --- Lembretes ------------------------------------------------------------
const taskTitles = [
  "Confirmar pagamento do pedido",
  "Separar e embalar para a entrega",
  "Retornar sobre o orçamento enviado",
  "Conferir estoque antes de prometer prazo",
  "Cobrar retorno do lojista",
  "Avisar que a garantia está perto de vencer",
];
const taskPayload = deals.slice(0, 26).map((deal, i) => {
  const done = i < 12;
  const due = done
    ? new Date(new Date(deal.created_at).getTime() + (3 + (i % 7)) * 86400000)
    : new Date(HOJE.getTime() + ((i % 8) - 3) * 86400000 + 15 * 3600000);
  return {
    owner_id: userId,
    org_id: orgId,
    workspace_key: WORKSPACE,
    assignee_id: userId,
    contact_id: deal.contact_id,
    deal_id: deal.id,
    title: taskTitles[i % taskTitles.length],
    due_at: due.toISOString(),
    done,
    recurrence: i === 19 ? "weekly" : "none",
    recurrence_spawned: false,
    created_at: new Date(due.getTime() - 2 * 86400000).toISOString(),
  };
});
await insert("tasks", taskPayload, "inserir lembretes");

// --- Coleções -------------------------------------------------------------
const collections = await insert("seller_collections", [
  ["Linha Cozinha 2026", "active", "2026-02-01", "2026-12-20", "Eletroportáteis e utensílios de cozinha da temporada."],
  ["Inverno em Casa", "active", "2026-04-15", "2026-09-30", "Aquecedores, mantas e itens de conforto para os meses frios."],
  ["Presentes de Fim de Ano", "draft", "2026-11-01", "2026-12-31", "Kits e itens de presente para novembro e dezembro."],
  ["Verão passado", "archived", "2025-10-01", "2026-02-28", "Ventilação e bebidas geladas. Encerrada, mantida para histórico."],
].map((c) => ({
  org_id: orgId, workspace_key: WORKSPACE, created_by: userId,
  name: c[0], status: c[1], starts_on: c[2], ends_on: c[3], description: c[4],
})), "inserir coleções");

// --- Catálogo -------------------------------------------------------------
// [nome, sku, categoria, marca, tipo, status, coleção, preço, custo, estoque, garantia, série?, variações]
const productSeeds = [
  ["Air fryer 5L digital", "AF-5000", "Eletroportáteis", "Cordoba", "durable", "active", 0, 49900, 31000, 34, 365, true, [["Preta", "AF-5000-PT", 18], ["Branca", "AF-5000-BR", 16]]],
  ["Air fryer 12L forno", "AF-1200", "Eletroportáteis", "Cordoba", "durable", "active", 0, 89900, 58000, 9, 365, true, []],
  ["Liquidificador 1200W", "LQ-1200", "Eletroportáteis", "Cordoba", "durable", "active", 0, 32900, 19500, 41, 365, true, [["127V", "LQ-1200-127", 22], ["220V", "LQ-1200-220", 19]]],
  ["Batedeira planetária 5L", "BT-PLAN5", "Eletroportáteis", "Vittorio", "durable", "active", 0, 74900, 47000, 12, 730, true, [["Vermelha", "BT-PLAN5-VM", 5], ["Prata", "BT-PLAN5-PR", 7]]],
  ["Panela de pressão elétrica 6L", "PP-E600", "Eletroportáteis", "Cordoba", "durable", "active", 0, 45900, 28900, 3, 365, true, []],
  ["Cafeteira espresso automática", "CF-ESP1", "Eletroportáteis", "Vittorio", "durable", "active", 0, 129900, 84000, 6, 730, true, []],
  ["Sanduicheira grill antiaderente", "SG-220", "Eletroportáteis", "Cordoba", "durable", "active", 0, 15900, 8900, 52, 365, false, []],
  ["Chaleira elétrica 1,7L", "CH-170", "Eletroportáteis", "Cordoba", "durable", "active", 0, 13900, 7600, 28, 365, false, []],
  ["Mixer de mão 3 em 1", "MX-300", "Eletroportáteis", "Vittorio", "durable", "active", 0, 21900, 12800, 19, 365, false, []],
  ["Jogo de panelas antiaderente 5 peças", "PN-AT5", "Utilidades", "Casa Viva", "general", "active", 0, 39900, 22000, 24, 90, false, [["Grafite", "PN-AT5-GF", 14], ["Cobre", "PN-AT5-CB", 10]]],
  ["Kit organizadores de despensa 8 peças", "OR-DES8", "Utilidades", "Casa Viva", "general", "active", 0, 12900, 6400, 63, 0, false, []],
  ["Purificador de água com refil", "PU-REF1", "Utilidades", "Vittorio", "durable", "active", 0, 68900, 42000, 11, 365, true, []],
  ["Aspirador vertical 2 em 1", "AS-V200", "Eletroportáteis", "Vittorio", "durable", "active", 0, 84900, 55000, 8, 365, true, []],
  ["Robô aspirador com mapeamento", "AS-ROB1", "Eletroportáteis", "Vittorio", "durable", "active", 0, 219900, 148000, 4, 730, true, []],
  ["Aquecedor cerâmico 1500W", "AQ-C150", "Conforto", "Cordoba", "durable", "active", 1, 27900, 16400, 37, 365, false, [["127V", "AQ-C150-127", 20], ["220V", "AQ-C150-220", 17]]],
  ["Manta cobertor casal microfibra", "MT-CAS1", "Moda casa", "Casa Viva", "fashion", "active", 1, 18900, 9200, 45, 0, false, [["Cinza", "MT-CAS1-CZ", 18], ["Bege", "MT-CAS1-BG", 15], ["Azul", "MT-CAS1-AZ", 12]]],
  ["Tapete felpudo 1,40 x 2,00", "TP-140", "Moda casa", "Casa Viva", "fashion", "active", 1, 24900, 13500, 16, 0, false, []],
  ["Ferro de passar a vapor", "FR-VAP1", "Eletroportáteis", "Cordoba", "durable", "active", null, 17900, 9800, 31, 365, false, []],
  ["Ventilador de coluna 40cm", "VT-C40", "Conforto", "Cordoba", "durable", "inactive", 3, 22900, 13100, 0, 365, false, []],
  ["Kit presente café e caneca", "KT-CAF1", "Presentes", "Casa Viva", "general", "draft", 2, 15900, 7900, 0, 0, false, []],
];

const products = await insert("seller_products", productSeeds.map((p, i) => ({
  org_id: orgId, workspace_key: WORKSPACE, created_by: userId,
  collection_id: p[6] === null ? null : collections[p[6]].id,
  name: p[0], sku: p[1], category: p[2], brand: p[3], kind: p[4], status: p[5],
  description: `${p[0]} — ${p[2].toLowerCase()} da linha ${p[3]}.`,
  base_price_cents: p[7], cost_cents: p[8],
  track_stock: true, stock_quantity: p[9], reserved_quantity: i % 6 === 0 ? 2 : 0,
  low_stock_threshold: p[9] < 12 ? 5 : null,
  warranty_days: p[10], requires_serial: p[11],
  default_commission_percent: p[4] === "fashion" ? 8 : 5,
  created_at: iso(monthDate(i + 1)),
})), "inserir produtos");

const variantsPayload = [];
productSeeds.forEach((p, i) => {
  for (const v of p[12]) {
    variantsPayload.push({
      org_id: orgId, product_id: products[i].id, name: v[0], sku: v[1],
      attributes: /\d+V$/.test(v[0]) ? { voltagem: v[0] } : { cor: v[0] },
      stock_quantity: v[2], active: true,
    });
  }
});
const variants = await insert("seller_product_variants", variantsPayload, "inserir variações");

// Uma entrada inicial por produto mais alguns ajustes: o extrato de estoque
// precisa contar uma história, não só mostrar o saldo atual.
const movements = products.map((product, i) => ({
  org_id: orgId, product_id: product.id, movement_type: "initial",
  quantity_delta: productSeeds[i][9] + 6, balance_after: productSeeds[i][9] + 6,
  reason: "Carga inicial do estoque", created_by: userId,
  created_at: iso(monthDate(i + 1)),
}));
products.slice(0, 10).forEach((product, i) => {
  movements.push({
    org_id: orgId, product_id: product.id, movement_type: i % 3 === 0 ? "adjustment" : "sale",
    quantity_delta: -(2 + (i % 4)), balance_after: productSeeds[i][9],
    reason: i % 3 === 0 ? "Acerto de contagem no depósito" : "Baixa por venda",
    created_by: userId,
    created_at: new Date(HOJE.getTime() - (i + 2) * 4 * 86400000).toISOString(),
  });
});
await insert("seller_inventory_movements", movements, "inserir movimentações de estoque");

// --- Pedidos --------------------------------------------------------------
// [status, pagamento, forma, entrega, dias atrás, itens: [índice do produto, qtd]]
const orderSpecs = [
  ["completed", "paid", "pix", "local_delivery", 96, [[0, 1], [7, 1]]],
  ["completed", "paid", "card", "pickup", 88, [[3, 1]]],
  ["completed", "paid", "installments", "carrier", 74, [[13, 1]]],
  ["completed", "paid", "pix", "local_delivery", 68, [[2, 2], [9, 1]]],
  ["completed", "paid", "bank_transfer", "carrier", 61, [[0, 8], [6, 12], [7, 10]]],
  ["completed", "paid", "pix", "pickup", 55, [[5, 1]]],
  ["completed", "paid", "card", "local_delivery", 47, [[12, 1], [10, 2]]],
  ["completed", "paid", "pix", "local_delivery", 40, [[15, 3], [16, 1]]],
  ["completed", "paid", "installments", "carrier", 34, [[1, 1], [4, 1]]],
  ["delivered", "paid", "pix", "local_delivery", 22, [[14, 2]]],
  ["delivered", "paid", "card", "carrier", 18, [[11, 1]]],
  ["delivered", "partial", "installments", "local_delivery", 15, [[13, 1], [8, 1]]],
  ["ready", "paid", "pix", "pickup", 9, [[6, 2], [10, 3]]],
  ["ready", "pending", "payment_link", "local_delivery", 7, [[9, 1], [16, 1]]],
  ["preparing", "paid", "pix", "carrier", 5, [[0, 6], [2, 6]]],
  ["preparing", "partial", "installments", "local_delivery", 4, [[3, 1], [5, 1]]],
  ["confirmed", "pending", "pix", "local_delivery", 3, [[7, 2], [8, 1]]],
  ["confirmed", "pending", "bank_transfer", "carrier", 2, [[15, 6], [17, 4]]],
  ["confirmed", "paid", "card", "pickup", 2, [[12, 1]]],
  ["draft", "pending", null, null, 1, [[14, 1], [10, 1]]],
  ["draft", "pending", null, null, 1, [[4, 1]]],
  ["cancelled", "refunded", "pix", "local_delivery", 29, [[1, 1]]],
];

const ordersPayload = orderSpecs.map((spec, i) => {
  const lojista = spec[5].some(([, qty]) => qty >= 4);
  const contact = lojista ? lojistas[i % lojistas.length] : contacts[(i * 3) % contacts.length];
  const criado = new Date(HOJE.getTime() - spec[4] * 86400000);
  const subtotal = spec[5].reduce((soma, [pi, qty]) => soma + productSeeds[pi][7] * qty, 0);
  const desconto = lojista ? Math.round(subtotal * 0.08) : i % 4 === 0 ? 2000 : 0;
  const frete = spec[3] === "carrier" ? 4900 : spec[3] === "local_delivery" ? 1500 : 0;
  return {
    org_id: orgId, workspace_key: WORKSPACE, created_by: userId,
    contact_id: contact.id,
    deal_id: dealsGanhos[i] ? dealsGanhos[i].id : null,
    order_number: `PED-${String(1041 + i)}`,
    status: spec[0], payment_status: spec[1], payment_method: spec[2], delivery_method: spec[3],
    subtotal_cents: subtotal, discount_cents: desconto, shipping_cents: frete,
    total_cents: Math.max(0, subtotal - desconto + frete),
    notes: lojista ? "Pedido de revenda; desconto de 8% já aplicado." : null,
    confirmed_at: spec[0] === "draft" ? null : criado.toISOString(),
    delivered_at: ["delivered", "completed"].includes(spec[0]) ? new Date(criado.getTime() + 3 * 86400000).toISOString() : null,
    created_at: criado.toISOString(),
  };
});
const orders = await insert("seller_orders", ordersPayload, "inserir pedidos");

const itemsPayload = [];
orderSpecs.forEach((spec, i) => {
  spec[5].forEach(([pi, qty]) => {
    const seed = productSeeds[pi];
    const variacao = variants.find((v) => v.product_id === products[pi].id) ?? null;
    itemsPayload.push({
      org_id: orgId, order_id: orders[i].id, product_id: products[pi].id,
      variant_id: variacao?.id ?? null,
      product_name_snapshot: seed[0], sku_snapshot: seed[1],
      variant_snapshot: variacao?.name ?? null,
      collection_name_snapshot: seed[6] === null ? null : collections[seed[6]].name,
      quantity: qty, unit_price_cents: seed[7],
      discount_cents: qty >= 4 ? Math.round(seed[7] * qty * 0.08) : 0,
      warranty_days_snapshot: seed[10],
      serial_number: seed[11] ? `SN${String(90000 + i * 17 + pi)}` : null,
      commission_percent: seed[4] === "fashion" ? 8 : 5,
      commission_cents: Math.round(seed[7] * qty * (seed[4] === "fashion" ? 0.08 : 0.05)),
      created_at: orders[i].created_at,
    });
  });
});
const items = await insert("seller_order_items", itemsPayload, "inserir itens dos pedidos");

// --- Pós-venda ------------------------------------------------------------
// Garantia só existe para item entregue de produto que tem garantia.
const entregues = new Set(orders.filter((o) => ["delivered", "completed"].includes(o.status)).map((o) => o.id));
const warrantiesPayload = items
  .filter((item) => entregues.has(item.order_id) && item.warranty_days_snapshot > 0)
  .map((item) => {
    const order = orders.find((o) => o.id === item.order_id);
    const inicio = new Date(order.delivered_at ?? order.created_at);
    return {
      org_id: orgId, order_item_id: item.id, contact_id: order.contact_id, product_id: item.product_id,
      serial_number: item.serial_number,
      starts_on: inicio.toISOString().slice(0, 10),
      expires_on: new Date(inicio.getTime() + item.warranty_days_snapshot * 86400000).toISOString().slice(0, 10),
      status: "active",
      notes: null,
    };
  });
const warranties = await insert("seller_warranties", warrantiesPayload, "inserir garantias");

const claimSpecs = [
  [0, "Air fryer parou de aquecer", "Cliente relata que o painel liga mas a resistência não esquenta. Aparelho tem menos de 4 meses de uso.", "assistance", null],
  [2, "Robô não retorna à base", "Depois da última atualização o robô encerra a limpeza no meio do cômodo e não volta sozinho.", "analysis", null],
  [4, "Peça faltando na caixa", "Faltou o cesto interno. Cliente mandou foto da embalagem aberta.", "replacement_approved", "Peça avulsa enviada pela transportadora; cliente confirmou o recebimento."],
  [6, "Barulho alto no motor", "Ruído acima do normal desde a primeira semana.", "resolved", "Trocado por unidade nova em loja. Cliente satisfeito."],
  [8, "Arranhão na tampa", "Avaria de transporte, sem prejuízo de funcionamento.", "refund_approved", "Abatimento de 15% no valor pago, aceito pelo cliente."],
];
const claimsPayload = claimSpecs
  .filter(([i]) => warranties[i])
  .map(([i, titulo, descricao, status, resolucao], n) => {
    const aberto = new Date(HOJE.getTime() - (5 + n * 6) * 86400000);
    return {
      org_id: orgId, warranty_id: warranties[i].id,
      title: titulo, issue_description: descricao, status,
      resolution: resolucao,
      opened_at: aberto.toISOString(),
      resolved_at: ["resolved", "cancelled"].includes(status) ? new Date(aberto.getTime() + 4 * 86400000).toISOString() : null,
      created_by: userId,
      created_at: aberto.toISOString(),
    };
  });
await insert("seller_warranty_claims", claimsPayload, "inserir chamados de pós-venda");

// --- Preferências de cliente ---------------------------------------------
await insert("seller_customer_profiles", contacts.slice(0, 8).map((contact, i) => ({
  org_id: orgId, contact_id: contact.id,
  preferred_colors: [["preto", "grafite"], ["branco"], ["vermelho", "cobre"], ["azul"], ["bege", "cinza"]][i % 5],
  style_notes: contact.details.perfil_cliente === "Lojista"
    ? "Compra por volume; prioriza margem e prazo de pagamento."
    : "Prefere marca conhecida e garantia estendida.",
  reorder_interval_days: [null, 90, 120, null, 180, 60, null, 150][i],
})), "inserir preferências de cliente");

console.log(JSON.stringify({
  login: AUTH_EMAIL,
  senha: "definida por SELLER_DEMO_AUTH_PASSWORD",
  pessoa: PERSON,
  negocio: BUSINESS,
  clientes: contacts.length,
  vendas: deals.length,
  conversas: interactionsPayload.length,
  lembretes: taskPayload.length,
  colecoes: collections.length,
  produtos: products.length,
  variacoes: variants.length,
  movimentacoes: movements.length,
  pedidos: orders.length,
  itens: items.length,
  garantias: warranties.length,
  chamados: claimsPayload.length,
}, null, 2));

async function insert(table, rows, label) {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

async function must(query, label) {
  const { error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
}

/**
 * Espalha os registros pelos últimos sete meses, terminando no mês de hoje.
 *
 * A versão anterior fixava os meses de janeiro a julho de 2026. Rodando em
 * agosto, o mês corrente ficava zerado — e é justamente ele que alimenta
 * "Vendido no mês" e a última linha do relatório. Ancorar em `HOJE` mantém a
 * demo verossímil em qualquer data.
 */
function monthDate(index) {
  const mesesAtras = 6 - (index % 7);
  const base = new Date(Date.UTC(HOJE.getUTCFullYear(), HOJE.getUTCMonth() - mesesAtras, 1, 11 + (index % 8), 0, 0));
  const ultimoDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  // No mês corrente nada pode nascer no futuro.
  const limite = mesesAtras === 0 ? HOJE.getUTCDate() : ultimoDia;
  base.setUTCDate(1 + ((index * 5) % Math.max(1, limite)));
  return base;
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
    const value = trimmed.slice(eq + 1).trim().replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
    if (!(name in process.env)) process.env[name] = value;
  }
}
