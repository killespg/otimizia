import type { DealStage } from "@/lib/supabase/types";

export type ProfessionType =
  | "autonomous_seller"
  | "law_office"
  | "real_estate_broker"
  | "service_provider"
  | "consultant"
  | "freelancer"
  | "livestock_producer"
  | "small_business"
  | "other"
  | "founder";

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

export type MessageTemplate = {
  key: string;
  label: string;
  body: string;
};

export type FollowUpOffset = {
  label: string;
  days: number;
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
  expertiseArea: string;
  stages: Record<DealStage, { label: string; empty: string }>;
  contactFields: FieldSpec[];
  dealFields: FieldSpec[];
  metrics: [MetricSpec, MetricSpec, MetricSpec, MetricSpec];
  messageTemplates: MessageTemplate[];
  followUpOffsets: FollowUpOffset[];
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
    expertiseArea: "vendas e negociação comercial",
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
    messageTemplates: [
      {
        key: "follow_up",
        label: "Follow-up de proposta",
        body: "Oi {{primeiro_nome}}! Passando para saber se você decidiu sobre a proposta.",
      },
      {
        key: "agradecimento",
        label: "Agradecimento pós-venda",
        body: "{{primeiro_nome}}, obrigado pela confiança! Qualquer coisa é só chamar.",
      },
    ],
    followUpOffsets: [
      { label: "Retornar amanhã", days: 1 },
      { label: "Retornar em 3 dias", days: 3 },
      { label: "Retornar em 1 semana", days: 7 },
    ],
  },
  law_office: {
    key: "law_office",
    signupLabel: "Escritório de advocacia",
    shortLabel: "Advocacia",
    pipelineLabel: "Atendimentos",
    pipelineTitle: "Atendimentos e propostas",
    pipelineDescription: "Acompanhe leads jurídicos, consultas, triagens, propostas de honorários e decisões de contratação.",
    dealSingular: "atendimento",
    dealPlural: "atendimentos",
    dealFieldLabel: "Atendimento jurídico",
    dealPlaceholder: "Ex: Consulta trabalhista - Maria",
    valueLabel: "Honorários em negociação",
    wonLabel: "Contratadas",
    contactsTitle: "Clientes e leads jurídicos",
    contactsDescription: "Registre contatos, origem, documentos pendentes e próximos retornos.",
    newContactTitle: "Novo cliente ou lead",
    firstSteps: ["Cadastre um cliente", "Crie um atendimento", "Agende um retorno"],
    assistantContext: "A pessoa atua em escritório de advocacia. Use vocabulário jurídico-comercial: triagem, consulta, documentos, proposta de honorários, contrato, retorno ao cliente, casos, prazos internos, honorários a receber e baixa de pagamentos. Diferencie proposta em negociação de contas a receber do escritório.",
    expertiseArea: "direito e advocacia",
    stages: {
      novo: { label: "Novo lead", empty: "Novos pedidos de atendimento entram aqui." },
      em_contato: { label: "Qualificação", empty: "Nenhuma qualificação em aberto." },
      negociacao: { label: "Proposta enviada", empty: "Nenhuma proposta de honorários agora." },
      ganho: { label: "Contratado", empty: "Atendimentos contratados aparecem aqui." },
      perdido: { label: "Não contratado", empty: "Sem atendimentos arquivados." },
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
      { key: "open_value", label: "Honorários em negociação" },
      { key: "open_deals", label: "Atendimentos em andamento" },
      { key: "won_count_month", label: "Contratos no mês" },
      { key: "conversion_rate", label: "Taxa de contratação" },
    ],
    messageTemplates: [
      {
        key: "retorno_documentos",
        label: "Cobrar documentos",
        body: "{{primeiro_nome}}, para dar andamento preciso dos documentos que combinamos. Consegue me enviar?",
      },
      {
        key: "proposta_honorarios",
        label: "Proposta de honorários",
        body: "{{primeiro_nome}}, segue a proposta de honorários do seu caso. Fico à disposição.",
      },
    ],
    followUpOffsets: [
      { label: "Cobrar documentos em 3 dias", days: 3 },
      { label: "Retornar em 1 semana", days: 7 },
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
    expertiseArea: "mercado imobiliário, financiamento e documentação de compra e venda de imóveis",
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
      {
        // RE-5xx (Fase 5): "funil de captação/subtipo de atendimento pra
        // proprietários" — reaproveita o campo genérico de detalhes por
        // profissão (details jsonb) já usado por tipo_imovel acima, em vez
        // de mexer no schema de deals ou no board genérico.
        key: "subtipo_atendimento",
        label: "Tipo de atendimento",
        type: "select",
        options: ["Comprador", "Captação/Proprietário", "Locatário", "Locador"],
      },
    ],
    metrics: [
      { key: "open_value", label: "Valor em negociação" },
      { key: "open_deals", label: "Atendimentos em andamento" },
      { key: "won_count_month", label: "Fechados no mês" },
      { key: "conversion_rate", label: "Conversão de leads" },
    ],
    messageTemplates: [
      {
        key: "primeiro_contato",
        label: "Primeiro contato",
        body: "Oi {{primeiro_nome}}! Aqui é {{meu_nome}}, corretor(a). Separei alguns imóveis no seu perfil, posso te enviar?",
      },
      {
        key: "pos_visita",
        label: "Depois da visita",
        body: "{{primeiro_nome}}, o que achou do imóvel? Quer que eu monte uma proposta?",
      },
    ],
    followUpOffsets: [
      { label: "Retornar em 2 dias", days: 2 },
      { label: "Retornar em 1 semana", days: 7 },
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
    expertiseArea: "prestação de serviços do ramo em que a pessoa atua",
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
    messageTemplates: [
      {
        key: "orcamento_enviado",
        label: "Orçamento enviado",
        body: "{{primeiro_nome}}, enviei o orçamento. Posso agendar?",
      },
      {
        key: "pos_servico",
        label: "Depois do serviço",
        body: "{{primeiro_nome}}, serviço concluído! Se precisar de manutenção, me chama.",
      },
    ],
    followUpOffsets: [
      { label: "Cobrar aprovação em 2 dias", days: 2 },
      { label: "Retornar em 1 semana", days: 7 },
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
    expertiseArea: "consultoria empresarial e estratégia de negócios",
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
    messageTemplates: [
      {
        key: "diagnostico_pronto",
        label: "Diagnóstico pronto",
        body: "{{primeiro_nome}}, terminei o diagnóstico. Posso te apresentar os próximos passos essa semana?",
      },
      {
        key: "proposta_enviada",
        label: "Proposta enviada",
        body: "{{primeiro_nome}}, segue a proposta do projeto. Fico à disposição pra qualquer ajuste.",
      },
    ],
    followUpOffsets: [
      { label: "Retornar em 3 dias", days: 3 },
      { label: "Retornar em 1 semana", days: 7 },
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
    expertiseArea: "trabalho freelance e prestação de serviços criativos ou técnicos",
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
    messageTemplates: [
      {
        key: "briefing_recebido",
        label: "Briefing recebido",
        body: "{{primeiro_nome}}, recebi o briefing! Te mando a proposta em breve.",
      },
      {
        key: "aprovacao_entrega",
        label: "Aguardando aprovação",
        body: "{{primeiro_nome}}, o projeto tá pronto pra revisão. Dá uma olhada e me fala o que achou?",
      },
    ],
    followUpOffsets: [
      { label: "Cobrar aprovação em 2 dias", days: 2 },
      { label: "Retornar em 1 semana", days: 7 },
    ],
  },
  livestock_producer: {
    key: "livestock_producer",
    signupLabel: "Pecuarista",
    shortLabel: "Pecuária",
    pipelineLabel: "Negócios",
    pipelineTitle: "Negócios pecuários em andamento",
    pipelineDescription: "Acompanhe lotes, compradores, fornecedores, propostas e próximos retornos.",
    dealSingular: "negócio",
    dealPlural: "negócios",
    dealFieldLabel: "Negócio",
    dealPlaceholder: "Ex: Lote de 30 bezerros",
    valueLabel: "Valor em negociação",
    wonLabel: "Fechados",
    contactsTitle: "Contatos da pecuária",
    contactsDescription: "Salve compradores, fornecedores, parceiros, fazendas e próximos retornos.",
    newContactTitle: "Novo contato rural",
    firstSteps: ["Cadastre um contato", "Crie um negócio", "Agende um retorno"],
    assistantContext: "A pessoa atua como pecuarista. Priorize lotes, rebanho, compra e venda de animais, fornecedores, compradores, prazos, sanidade, reposição e retorno por WhatsApp.",
    expertiseArea: "pecuária, manejo de rebanho e produção rural",
    stages: {
      novo: { label: "Novo contato", empty: "Novas oportunidades entram aqui." },
      em_contato: { label: "Em avaliação", empty: "Nenhum lote em avaliação." },
      negociacao: { label: "Negociação", empty: "Nenhuma negociação aberta." },
      ganho: { label: "Fechado", empty: "Negócios fechados aparecem aqui." },
      perdido: { label: "Perdido", empty: "Sem oportunidades perdidas." },
    },
    contactFields: [
      {
        key: "tipo_contato",
        label: "Tipo de contato",
        type: "select",
        options: ["Comprador", "Fornecedor", "Veterinário", "Transportador", "Parceiro", "Outro"],
      },
      { key: "fazenda", label: "Fazenda", type: "text", placeholder: "Ex: Fazenda Boa Vista" },
      { key: "cidade", label: "Cidade/UF", type: "text", placeholder: "Ex: Goiânia - GO" },
    ],
    dealFields: [
      {
        key: "tipo_animal",
        label: "Tipo de animal",
        type: "select",
        options: ["Boi gordo", "Bezerro", "Novilha", "Vaca", "Matriz", "Touro", "Outro"],
      },
      { key: "quantidade", label: "Quantidade", type: "text", placeholder: "Ex: 30 cabeças" },
      { key: "peso_medio", label: "Peso médio", type: "text", placeholder: "Ex: 12 arrobas" },
    ],
    metrics: [
      { key: "open_value", label: "Valor em negociação" },
      { key: "open_deals", label: "Negócios em andamento" },
      { key: "won_value_month", label: "Fechado no mês" },
      { key: "overdue_tasks", label: "Retornos atrasados" },
    ],
    messageTemplates: [
      {
        key: "retorno_lote",
        label: "Retorno sobre lote",
        body: "Oi {{primeiro_nome}}! Passando para saber se você avaliou o lote e se seguimos com a negociação.",
      },
      {
        key: "confirmar_visita",
        label: "Confirmar visita",
        body: "{{primeiro_nome}}, confirmando nossa visita para olhar os animais. O horário continua bom para você?",
      },
    ],
    followUpOffsets: [
      { label: "Retornar amanhã", days: 1 },
      { label: "Retornar em 3 dias", days: 3 },
      { label: "Retornar em 1 semana", days: 7 },
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
    expertiseArea: "comércio e varejo",
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
    messageTemplates: [
      {
        key: "pedido_pronto",
        label: "Pedido pronto",
        body: "{{primeiro_nome}}, seu pedido já está pronto! Como prefere receber ou retirar?",
      },
      {
        key: "recompra",
        label: "Sugestão de recompra",
        body: "Oi {{primeiro_nome}}! Faz um tempo que você não passa por aqui — separei umas novidades que combinam com você.",
      },
    ],
    followUpOffsets: [
      { label: "Cobrar pagamento em 2 dias", days: 2 },
      { label: "Sugerir recompra em 30 dias", days: 30 },
    ],
  },
  founder: {
    key: "founder",
    signupLabel: "Fundador",
    shortLabel: "Prospecção",
    pipelineLabel: "Prospecção",
    pipelineTitle: "Prospecção do OtimizIA",
    pipelineDescription: "Acompanhe quem você abordou, quem respondeu e quem virou cliente pagante.",
    dealSingular: "prospect",
    dealPlural: "prospects",
    dealFieldLabel: "Prospect",
    dealPlaceholder: "Ex: Personal trainer abordado no Instagram",
    valueLabel: "Potencial em conversa",
    wonLabel: "Convertidos",
    contactsTitle: "Pessoas abordadas",
    contactsDescription: "Salve quem você chamou, por qual canal, e o retorno que deu.",
    newContactTitle: "Nova pessoa abordada",
    firstSteps: ["Cadastre quem você abordou", "Marque o estágio da conversa", "Agende um retorno"],
    assistantContext: "A pessoa é a fundadora do OtimizIA e usa o próprio CRM para gerenciar a prospecção de clientes do produto (mensagem direta, vídeos, indicação). Priorize taxa de resposta, conversão de contato para cadastro e de cadastro para cliente pagante.",
    expertiseArea: "gestão de produto e crescimento de SaaS",
    stages: {
      novo: { label: "Identificado", empty: "Pessoas que você quer abordar entram aqui." },
      em_contato: { label: "Mensagem enviada", empty: "Nenhuma mensagem em aberto." },
      negociacao: { label: "Conversando", empty: "Ninguém respondendo agora." },
      ganho: { label: "Cliente pagante", empty: "Conversões aparecem aqui." },
      perdido: { label: "Não converteu", empty: "Sem descartes registrados." },
    },
    contactFields: [
      {
        key: "canal_abordagem",
        label: "Canal de abordagem",
        type: "select",
        options: ["Mensagem direta", "Indicação", "TikTok/Reels", "Grupo", "Outro"],
      },
    ],
    dealFields: [
      { key: "status_conversa", label: "Status da conversa", type: "text", placeholder: "Ex: Pediu mais informações" },
    ],
    metrics: [
      { key: "contacts", label: "Pessoas abordadas" },
      { key: "open_deals", label: "Em conversa" },
      { key: "won_count_month", label: "Viraram clientes no mês" },
      { key: "conversion_rate", label: "Taxa de conversão" },
    ],
    messageTemplates: [
      {
        key: "abordagem_inicial",
        label: "Abordagem inicial",
        body: "Oi {{primeiro_nome}}, tudo bem? Tô desenvolvendo um app pra ajudar quem vende pelo WhatsApp a não perder cliente e lembrete — queria muito seu feedback sincero. Topa dar uma olhada?",
      },
      {
        key: "follow_up_video",
        label: "Follow-up pós-vídeo",
        body: "{{primeiro_nome}}, vi que você curtiu o vídeo — se quiser eu te mostro rapidinho como funciona, sem compromisso.",
      },
    ],
    followUpOffsets: [
      { label: "Retornar amanhã", days: 1 },
      { label: "Retornar em 3 dias", days: 3 },
      { label: "Retornar em 1 semana", days: 7 },
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
    expertiseArea: "gestão comercial e atendimento ao cliente",
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
    messageTemplates: [
      {
        key: "follow_up",
        label: "Follow-up",
        body: "Oi {{primeiro_nome}}! Passando pra saber se ficou alguma dúvida ou se posso ajudar em algo.",
      },
      {
        key: "agradecimento",
        label: "Agradecimento",
        body: "{{primeiro_nome}}, obrigado pelo contato! Qualquer coisa é só chamar.",
      },
    ],
    followUpOffsets: [
      { label: "Retornar em 3 dias", days: 3 },
      { label: "Retornar em 1 semana", days: 7 },
    ],
  },
};

// "founder" nunca aparece aqui — é um preset interno, atribuído só por
// is_admin (ver lib/workspaces.ts), nunca selecionável por conta comum.
export const PROFESSION_OPTIONS = Object.values(PROFESSION_PRESETS)
  .filter((preset) => preset.key !== "founder")
  .map((preset) => ({
    value: preset.key,
    label: preset.signupLabel,
  }));

// Só valida contra as opções públicas — garante que nenhuma entrada vinda de
// usuário (formulário ou chamada direta à API) resolva para "founder".
export function normalizeProfession(value: unknown): ProfessionType {
  return typeof value === "string" &&
    PROFESSION_OPTIONS.some((option) => option.value === value)
    ? (value as ProfessionType)
    : "autonomous_seller";
}

// Recebe uma chave já resolvida e confiável (via normalizeProfession ou o
// bypass de is_admin em getWorkspaceKey) — não re-valida contra a lista
// pública, então pode retornar o preset "founder".
export function getProfessionPreset(key: ProfessionType): ProfessionPreset {
  return PROFESSION_PRESETS[key] ?? PROFESSION_PRESETS.autonomous_seller;
}
