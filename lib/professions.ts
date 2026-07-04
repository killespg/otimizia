import type { DealStage } from "@/lib/supabase/types";

export type ProfessionType =
  | "autonomous_seller"
  | "law_office"
  | "real_estate_broker"
  | "service_provider"
  | "consultant"
  | "freelancer"
  | "small_business"
  | "other";

export type FieldType = "text" | "select" | "date";

export type FieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
};

export type MetricKey =
  | "open_value"
  | "open_deals"
  | "won_value_month"
  | "won_count_month"
  | "contacts"
  | "overdue_tasks"
  | "conversations_today"
  | "conversion_rate"
  | "avg_ticket";

export type MetricSpec = {
  key: MetricKey;
  label: string;
};

export type ProfessionPreset = {
  key: ProfessionType;
  signupLabel: string;
  shortLabel: string;
  pipelineLabel: string;
  pipelineTitle: string;
  pipelineDescription: string;
  dealSingular: string;
  dealPlural: string;
  dealFieldLabel: string;
  dealPlaceholder: string;
  valueLabel: string;
  wonLabel: string;
  contactsTitle: string;
  contactsDescription: string;
  newContactTitle: string;
  firstSteps: [string, string, string];
  assistantContext: string;
  stages: Record<DealStage, { label: string; empty: string }>;
  contactFields: FieldSpec[];
  dealFields: FieldSpec[];
  metrics: [MetricSpec, MetricSpec, MetricSpec, MetricSpec];
};

const DEFAULT_STAGES: ProfessionPreset["stages"] = {
  novo: { label: "Novo", empty: "Novas oportunidades entram aqui." },
  em_contato: { label: "Em contato", empty: "Sem contato em aberto." },
  negociacao: { label: "Proposta", empty: "Nenhuma proposta agora." },
  ganho: { label: "Ganho", empty: "Fechamentos aparecem aqui." },
  perdido: { label: "Perdido", empty: "Sem perdas registradas." },
};

export const PROFESSION_PRESETS: Record<ProfessionType, ProfessionPreset> = {
  autonomous_seller: {
    key: "autonomous_seller",
    signupLabel: "Vendedor autônomo",
    shortLabel: "Vendas",
    pipelineLabel: "Vendas",
    pipelineTitle: "Negócios em andamento",
    pipelineDescription: "Mova cada venda por etapa e mantenha o próximo passo visível.",
    dealSingular: "venda",
    dealPlural: "vendas",
    dealFieldLabel: "Venda",
    dealPlaceholder: "Ex: Plano mensal",
    valueLabel: "Valor aberto",
    wonLabel: "Ganhas",
    contactsTitle: "Seus clientes",
    contactsDescription: "Salve clientes, empresas e detalhes para não perder o próximo contato.",
    newContactTitle: "Novo cliente",
    firstSteps: ["Cadastre um contato", "Crie uma venda", "Crie um lembrete"],
    assistantContext: "A pessoa trabalha com vendas autônomas. Priorize follow-ups, propostas, clientes quentes e fechamento.",
    stages: DEFAULT_STAGES,
    contactFields: [
      { key: "produto_interesse", label: "Produto de interesse", type: "text", placeholder: "Ex: Plano anual" },
    ],
    dealFields: [
      { key: "proximo_passo", label: "Próximo passo", type: "text", placeholder: "Ex: Enviar proposta por WhatsApp" },
    ],
    metrics: [
      { key: "open_value", label: "Valor aberto" },
      { key: "open_deals", label: "Vendas em andamento" },
      { key: "won_value_month", label: "Ganhas no mês" },
      { key: "overdue_tasks", label: "Follow-ups atrasados" },
    ],
  },
  law_office: {
    key: "law_office",
    signupLabel: "Escritório de advocacia",
    shortLabel: "Advocacia",
    pipelineLabel: "Contratações",
    pipelineTitle: "Contratações em andamento",
    pipelineDescription: "Acompanhe triagens, consultas, propostas de honorários e contratos assinados.",
    dealSingular: "contratação",
    dealPlural: "contratações",
    dealFieldLabel: "Caso ou contratação",
    dealPlaceholder: "Ex: Ação trabalhista - Maria",
    valueLabel: "Honorários em aberto",
    wonLabel: "Contratadas",
    contactsTitle: "Clientes e leads jurídicos",
    contactsDescription: "Registre contatos, origem, documentos pendentes e próximos retornos.",
    newContactTitle: "Novo cliente ou lead",
    firstSteps: ["Cadastre um cliente", "Crie uma contratação", "Agende um retorno"],
    assistantContext: "A pessoa atua em escritório de advocacia. Use vocabulário jurídico-comercial: triagem, consulta, documentos, proposta de honorários, contrato e retorno ao cliente. Não trate como gestão de prazos judiciais.",
    stages: {
      novo: { label: "Novo contato", empty: "Novos pedidos de atendimento entram aqui." },
      em_contato: { label: "Triagem", empty: "Nenhuma triagem em aberto." },
      negociacao: { label: "Proposta enviada", empty: "Nenhuma proposta de honorários agora." },
      ganho: { label: "Contrato assinado", empty: "Contratações assinadas aparecem aqui." },
      perdido: { label: "Arquivado", empty: "Sem oportunidades arquivadas." },
    },
    contactFields: [
      { key: "tipo_cliente", label: "Tipo de cliente", type: "select", options: ["Pessoa física", "Pessoa jurídica"] },
    ],
    dealFields: [
      {
        key: "area_direito",
        label: "Área",
        type: "select",
        options: ["Trabalhista", "Cível", "Família", "Tributário", "Criminal", "Empresarial", "Outra"],
      },
      { key: "comarca", label: "Comarca", type: "text", placeholder: "Ex: São Paulo - SP" },
    ],
    metrics: [
      { key: "open_value", label: "Honorários em aberto" },
      { key: "open_deals", label: "Contratações em andamento" },
      { key: "won_count_month", label: "Contratos no mês" },
      { key: "conversion_rate", label: "Taxa de contratação" },
    ],
  },
  real_estate_broker: {
    key: "real_estate_broker",
    signupLabel: "Corretor de imóveis autônomo",
    shortLabel: "Imóveis",
    pipelineLabel: "Imóveis",
    pipelineTitle: "Atendimentos imobiliários",
    pipelineDescription: "Acompanhe leads, imóveis enviados, visitas marcadas e propostas.",
    dealSingular: "atendimento",
    dealPlural: "atendimentos",
    dealFieldLabel: "Atendimento",
    dealPlaceholder: "Ex: Apartamento até R$ 500 mil",
    valueLabel: "Valor em negociação",
    wonLabel: "Fechados",
    contactsTitle: "Clientes compradores e proprietários",
    contactsDescription: "Guarde perfil, preferência, bairro, orçamento e próximos retornos.",
    newContactTitle: "Novo lead imobiliário",
    firstSteps: ["Cadastre um lead", "Crie um atendimento", "Marque um retorno"],
    assistantContext: "A pessoa é corretora de imóveis. Priorize perfil do comprador, bairros, orçamento, visitas, imóveis enviados e propostas.",
    stages: {
      novo: { label: "Novo lead", empty: "Novos leads entram aqui." },
      em_contato: { label: "Perfil analisado", empty: "Nenhum perfil em análise." },
      negociacao: { label: "Visita/proposta", empty: "Nenhuma visita ou proposta agora." },
      ganho: { label: "Fechado", empty: "Negócios fechados aparecem aqui." },
      perdido: { label: "Perdido", empty: "Sem perdas registradas." },
    },
    contactFields: [
      {
        key: "perfil_lead",
        label: "Perfil",
        type: "select",
        options: ["Comprador", "Vendedor", "Locatário", "Proprietário"],
      },
      { key: "orcamento", label: "Orçamento", type: "text", placeholder: "Ex: até R$ 500 mil" },
      { key: "bairro", label: "Bairro de interesse", type: "text", placeholder: "Ex: Zona Sul" },
    ],
    dealFields: [
      {
        key: "tipo_imovel",
        label: "Tipo de imóvel",
        type: "select",
        options: ["Apartamento", "Casa", "Terreno", "Comercial", "Rural"],
      },
    ],
    metrics: [
      { key: "open_value", label: "Valor em negociação" },
      { key: "open_deals", label: "Atendimentos em andamento" },
      { key: "won_count_month", label: "Fechados no mês" },
      { key: "conversion_rate", label: "Conversão de leads" },
    ],
  },
  service_provider: {
    key: "service_provider",
    signupLabel: "Prestador de serviços",
    shortLabel: "Serviços",
    pipelineLabel: "Serviços",
    pipelineTitle: "Serviços em negociação",
    pipelineDescription: "Acompanhe pedidos, orçamentos, execução e retornos.",
    dealSingular: "serviço",
    dealPlural: "serviços",
    dealFieldLabel: "Serviço",
    dealPlaceholder: "Ex: Manutenção mensal",
    valueLabel: "Orçamentos em aberto",
    wonLabel: "Aprovados",
    contactsTitle: "Clientes de serviços",
    contactsDescription: "Salve pedidos, orçamento, histórico e próximos retornos.",
    newContactTitle: "Novo cliente",
    firstSteps: ["Cadastre um cliente", "Crie um serviço", "Agende um retorno"],
    assistantContext: "A pessoa presta serviços. Priorize orçamento, aprovação, agenda, retorno e recorrência.",
    stages: {
      novo: { label: "Solicitado", empty: "Novos pedidos entram aqui." },
      em_contato: { label: "Orçamento enviado", empty: "Nenhum orçamento em aberto." },
      negociacao: { label: "Em execução", empty: "Nenhum serviço em execução agora." },
      ganho: { label: "Concluído", empty: "Serviços concluídos aparecem aqui." },
      perdido: { label: "Recusado", empty: "Sem orçamentos recusados." },
    },
    contactFields: [
      { key: "servico_interesse", label: "Serviço de interesse", type: "text", placeholder: "Ex: Manutenção elétrica" },
    ],
    dealFields: [
      {
        key: "recorrencia",
        label: "Recorrência",
        type: "select",
        options: ["Pontual", "Mensal", "Trimestral", "Anual"],
      },
    ],
    metrics: [
      { key: "open_value", label: "Orçamentos em aberto" },
      { key: "open_deals", label: "Serviços em andamento" },
      { key: "won_count_month", label: "Aprovados no mês" },
      { key: "avg_ticket", label: "Ticket médio" },
    ],
  },
  consultant: {
    key: "consultant",
    signupLabel: "Consultor",
    shortLabel: "Consultoria",
    pipelineLabel: "Projetos",
    pipelineTitle: "Projetos em negociação",
    pipelineDescription: "Acompanhe diagnósticos, propostas e fechamentos de consultoria.",
    dealSingular: "projeto",
    dealPlural: "projetos",
    dealFieldLabel: "Projeto",
    dealPlaceholder: "Ex: Diagnóstico comercial",
    valueLabel: "Propostas em aberto",
    wonLabel: "Fechados",
    contactsTitle: "Clientes e empresas",
    contactsDescription: "Registre contexto, dor do cliente e próximo passo da consultoria.",
    newContactTitle: "Novo contato",
    firstSteps: ["Cadastre uma empresa", "Crie um projeto", "Agende um follow-up"],
    assistantContext: "A pessoa vende consultoria. Priorize diagnóstico, proposta, decisores, follow-up e próximos passos.",
    stages: {
      novo: { label: "Novo contato", empty: "Novos contatos entram aqui." },
      em_contato: { label: "Diagnóstico", empty: "Nenhum diagnóstico em andamento." },
      negociacao: { label: "Proposta enviada", empty: "Nenhuma proposta em aberto." },
      ganho: { label: "Fechado", empty: "Projetos fechados aparecem aqui." },
      perdido: { label: "Perdido", empty: "Sem perdas registradas." },
    },
    contactFields: [
      { key: "porte", label: "Porte", type: "select", options: ["Pequena", "Média", "Grande"] },
      { key: "segmento", label: "Segmento", type: "text", placeholder: "Ex: Varejo, indústria..." },
    ],
    dealFields: [
      { key: "escopo", label: "Escopo", type: "text", placeholder: "Ex: Diagnóstico + plano de 90 dias" },
      { key: "duracao", label: "Duração estimada", type: "text", placeholder: "Ex: 3 meses" },
    ],
    metrics: [
      { key: "open_value", label: "Propostas em aberto" },
      { key: "open_deals", label: "Projetos em andamento" },
      { key: "won_count_month", label: "Fechados no mês" },
      { key: "avg_ticket", label: "Ticket médio" },
    ],
  },
  freelancer: {
    key: "freelancer",
    signupLabel: "Freelancer",
    shortLabel: "Freela",
    pipelineLabel: "Projetos",
    pipelineTitle: "Projetos em andamento",
    pipelineDescription: "Organize conversas, propostas e entregas combinadas.",
    dealSingular: "projeto",
    dealPlural: "projetos",
    dealFieldLabel: "Projeto",
    dealPlaceholder: "Ex: Site institucional",
    valueLabel: "Projetos em aberto",
    wonLabel: "Fechados",
    contactsTitle: "Clientes e prospects",
    contactsDescription: "Salve briefing, orçamento e próximos retornos.",
    newContactTitle: "Novo cliente",
    firstSteps: ["Cadastre um cliente", "Crie um projeto", "Agende um follow-up"],
    assistantContext: "A pessoa é freelancer. Priorize briefing, proposta, prazo, aprovação e follow-up.",
    stages: {
      novo: { label: "Briefing", empty: "Novos briefings entram aqui." },
      em_contato: { label: "Proposta enviada", empty: "Nenhuma proposta em aberto." },
      negociacao: { label: "Em produção", empty: "Nenhum projeto em produção agora." },
      ganho: { label: "Entregue", empty: "Projetos entregues aparecem aqui." },
      perdido: { label: "Cancelado", empty: "Sem projetos cancelados." },
    },
    contactFields: [
      { key: "como_chegou", label: "Como chegou até você", type: "text", placeholder: "Ex: Indicação, Instagram..." },
    ],
    dealFields: [
      { key: "tipo_projeto", label: "Tipo de projeto", type: "text", placeholder: "Ex: Landing page" },
      { key: "prazo", label: "Prazo de entrega", type: "date" },
    ],
    metrics: [
      { key: "open_value", label: "Projetos em aberto" },
      { key: "open_deals", label: "Em andamento" },
      { key: "won_count_month", label: "Entregues no mês" },
      { key: "overdue_tasks", label: "Prazos atrasados" },
    ],
  },
  small_business: {
    key: "small_business",
    signupLabel: "Loja ou pequeno comércio",
    shortLabel: "Comércio",
    pipelineLabel: "Pedidos",
    pipelineTitle: "Pedidos e oportunidades",
    pipelineDescription: "Acompanhe pedidos, retornos e clientes que precisam de atenção.",
    dealSingular: "pedido",
    dealPlural: "pedidos",
    dealFieldLabel: "Pedido",
    dealPlaceholder: "Ex: Pedido de reposição",
    valueLabel: "Pedidos em aberto",
    wonLabel: "Vendidos",
    contactsTitle: "Clientes",
    contactsDescription: "Salve clientes, preferências, pedidos e retornos.",
    newContactTitle: "Novo cliente",
    firstSteps: ["Cadastre um cliente", "Crie um pedido", "Agende um retorno"],
    assistantContext: "A pessoa toca uma loja ou pequeno comércio. Priorize pedidos, recompra, retorno e clientes recorrentes.",
    stages: {
      novo: { label: "Novo pedido", empty: "Novos pedidos entram aqui." },
      em_contato: { label: "Em separação", empty: "Nenhum pedido em separação." },
      negociacao: { label: "Aguardando pagamento", empty: "Nenhum pedido aguardando pagamento." },
      ganho: { label: "Vendido", empty: "Pedidos vendidos aparecem aqui." },
      perdido: { label: "Cancelado", empty: "Sem pedidos cancelados." },
    },
    contactFields: [
      { key: "preferencias", label: "Preferências", type: "text", placeholder: "Ex: Tamanho, marca preferida..." },
    ],
    dealFields: [
      {
        key: "canal_venda",
        label: "Canal de venda",
        type: "select",
        options: ["Loja física", "WhatsApp", "Instagram", "Marketplace", "Site"],
      },
    ],
    metrics: [
      { key: "open_value", label: "Pedidos em aberto" },
      { key: "open_deals", label: "Pedidos ativos" },
      { key: "won_value_month", label: "Vendido no mês" },
      { key: "avg_ticket", label: "Ticket médio" },
    ],
  },
  other: {
    key: "other",
    signupLabel: "Outro",
    shortLabel: "Negócio",
    pipelineLabel: "Oportunidades",
    pipelineTitle: "Oportunidades em andamento",
    pipelineDescription: "Adapte o funil ao seu jeito de vender e acompanhar clientes.",
    dealSingular: "oportunidade",
    dealPlural: "oportunidades",
    dealFieldLabel: "Oportunidade",
    dealPlaceholder: "Ex: Novo atendimento",
    valueLabel: "Valor aberto",
    wonLabel: "Fechadas",
    contactsTitle: "Seus contatos",
    contactsDescription: "Salve contatos, contexto e próximos passos.",
    newContactTitle: "Novo contato",
    firstSteps: ["Cadastre um contato", "Crie uma oportunidade", "Agende um retorno"],
    assistantContext: "A pessoa usa o OtimizIA para relacionamento, oportunidades e follow-ups. Use linguagem genérica e simples.",
    stages: DEFAULT_STAGES,
    contactFields: [],
    dealFields: [
      { key: "proximo_passo", label: "Próximo passo", type: "text", placeholder: "Ex: Retornar contato" },
    ],
    metrics: [
      { key: "open_value", label: "Valor aberto" },
      { key: "open_deals", label: "Oportunidades em andamento" },
      { key: "won_count_month", label: "Fechadas no mês" },
      { key: "overdue_tasks", label: "Tarefas atrasadas" },
    ],
  },
};

export const PROFESSION_OPTIONS = Object.values(PROFESSION_PRESETS).map((preset) => ({
  value: preset.key,
  label: preset.signupLabel,
}));

export function normalizeProfession(value: unknown): ProfessionType {
  return typeof value === "string" && value in PROFESSION_PRESETS
    ? (value as ProfessionType)
    : "autonomous_seller";
}

export function getProfessionPreset(value: unknown): ProfessionPreset {
  return PROFESSION_PRESETS[normalizeProfession(value)];
}
