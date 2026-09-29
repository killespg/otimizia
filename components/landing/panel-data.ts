import {
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileClock,
  Gavel,
  Images,
  MessageCircle,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Dados da demonstração do painel (textos e números fictícios da landing,
 * mantidos da versão anterior). Os ícones ficam aqui, no módulo de dados,
 * porque quem os consome é um componente cliente.
 */

export type Metric = { icon: LucideIcon; label: string; value: string; note: string };
export type Row = { name: string; note: string; urgent?: boolean };

export type Profession = {
  key: string;
  org: string;
  role: string;
  search: string;
  /* Cabecalho do painel, espelhando o produto: data, saudacao e o resumo com
     os dois sinais do dia, seguidos das duas acoes do canto. */
  dateLabel: string;
  greeting: string;
  summaryPrefix: string;
  summaryAlert: string;
  summaryCount: string;
  summarySuffix: string;
  secondaryAction: string;
  primaryAction: string;
  timPrompt: string;
  workspaceLabel: string;
  /** Item de lista da vertical: carteira, processos ou funil. */
  userName: string;
  listNav: string;
  listLabel: string;
  /* Grupos rotulados da sidebar, com contador por item — a gramatica que o
     produto usa. Lista chapada nao parecia a navegacao real. */
  groups: Array<{ label: string; items: Array<{ label: string; badge?: number; danger?: boolean }> }>;
  subItems: string[];
  metrics: Metric[];
  chartLabel: string;
  chartDays: number[];
  queueLabel: string;
  queue: Row[];
  listRows: Row[];
  /* Painel de indicadores do produto: tres colunas de rotulo/valor. */
  indicatorsTitle: string;
  indicatorsNote: string;
  indicators: Array<{ group: string; rows: Array<[string, string, string]> }>;
};

/**
 * Demonstração navegável do painel.
 *
 * Em vez de abas por cima do card, quem explora clica na própria sidebar, como
 * faria dentro do produto — a barra deixa de ser desenho e vira a navegação. A
 * troca de profissão fica no bloco da organização, que é onde o
 * WorkspaceSwitcher real vive.
 *
 * São as três profissões liberadas hoje no cadastro.
 */
export const PROFESSIONS: Profession[] = [
  {
    key: "real_estate_broker",
    org: "Mariana Costa Imóveis",
    userName: "Mariana Costa",
    role: "Corretor de imóveis",
    search: "Buscar imóvel, bairro ou cidade",
    dateLabel: "Sábado, 25 de julho",
    greeting: "Bom dia, Mariana.",
    summaryPrefix: "Sua operação tem",
    summaryAlert: "7 pontos de atenção",
    summaryCount: "13 imóveis ativos",
    summarySuffix: "na carteira.",
    secondaryAction: "Agenda de visitas",
    primaryAction: "Novo imóvel",
    timPrompt: "Pergunte ao Tim sobre sua carteira, clientes e negociações",
    workspaceLabel: "Visão geral de imóveis",
    listNav: "Carteira de imóveis",
    listLabel: "Imóveis ativos na carteira",
    metrics: [
      { icon: Building2, label: "Imóveis ativos", value: "13", note: "2 captações no período" },
      { icon: Images, label: "Vitrines enviadas", value: "1", note: "seleções criadas" },
      { icon: CalendarDays, label: "Visitas", value: "6/16", note: "4 aguardando confirmação" },
      { icon: CircleDollarSign, label: "Comissão prevista", value: "R$ 562.650", note: "R$ 352.900 recebida" },
    ],
    chartLabel: "Visitas da semana",
    chartDays: [38, 52, 44, 68, 59, 81, 72],
    queueLabel: "Quem chamar hoje",
    queue: [
      { name: "Marina Alves", note: "Proposta enviada", urgent: true },
      { name: "Rafael Souza", note: "Visita confirmada" },
      { name: "Studio Nova", note: "Aguardando contrato" },
    ],
    listRows: [
      { name: "Apartamento com varanda", note: "Vila Mariana · R$ 785.000" },
      { name: "Cobertura duplex com vista", note: "Sumaré · R$ 1.240.000", urgent: true },
      { name: "Conjunto comercial", note: "Berrini · R$ 640.000" },
      { name: "Loja de esquina", note: "Pinheiros · R$ 980.000" },
    ],
    indicatorsTitle: "Indicadores imobiliários",
    indicatorsNote: "Carteira, eficiência comercial e resultado financeiro.",
    indicators: [
      { group: "Conversão e carteira", rows: [["Taxa de aceitação", "—", "Sem propostas no período"], ["Visitas concluídas", "6/16", "visitas realizadas"], ["Captações", "2", "imóveis adicionados"]] },
      { group: "Indicadores financeiros", rows: [["Comissão prevista", "R$ 562.650,00", "valor esperado"], ["Comissão recebida", "R$ 352.900,00", "63% da previsão"], ["Meta comercial", "R$ 2.200.000,00", "meta do período"]] },
      { group: "Esforço operacional", rows: [["Vitrines enviadas", "1", "seleções compartilhadas"], ["Propostas em aberto", "0", "nenhuma aguardando"], ["Comissões vencidas", "3", "exigem acompanhamento"]] },
    ],
    groups: [
      { label: "Imobiliário", items: [{ label: "Carteira de imóveis", badge: 18 }, { label: "Mapa" }, { label: "Agenda de visitas", badge: 10, danger: true }, { label: "Vitrines", badge: 4 }] },
      { label: "Comercial", items: [{ label: "Clientes" }, { label: "Atendimentos", badge: 34 }, { label: "Calendário" }] },
      { label: "Gestão", items: [{ label: "Comissões e metas" }, { label: "Equipe" }, { label: "Relatórios" }] },
    ],
    subItems: ["Minha operação", "Metas e comissões"],
  },
  {
    key: "law_office",
    org: "Ribeiro & Associados",
    userName: "Helena Ribeiro",
    role: "Escritório de advocacia",
    search: "Buscar caso, cliente ou processo",
    dateLabel: "Sábado, 25 de julho",
    greeting: "Bom dia, Helena.",
    summaryPrefix: "O escritório começa o dia com",
    summaryAlert: "3 prazos críticos",
    summaryCount: "12 movimentações",
    summarySuffix: "para revisar.",
    secondaryAction: "Ver prazos",
    primaryAction: "Novo caso",
    timPrompt: "Pergunte ao Tim sobre prazos, processos e honorários",
    workspaceLabel: "Panorama do escritório",
    listNav: "Processos",
    listLabel: "Casos em andamento",
    metrics: [
      { icon: FileClock, label: "Prazos críticos", value: "3", note: "vencem hoje" },
      { icon: Gavel, label: "Casos ativos", value: "48", note: "9 sem movimento" },
      { icon: Bell, label: "Movimentações", value: "12", note: "para revisar" },
      { icon: CircleDollarSign, label: "Honorários", value: "R$ 84.300", note: "R$ 19.200 vencidos" },
    ],
    chartLabel: "Prazos da semana",
    chartDays: [22, 41, 63, 48, 77, 35, 28],
    queueLabel: "Prioridades de hoje",
    queue: [
      { name: "Ação trabalhista · Vieira", note: "Contestação vence hoje", urgent: true },
      { name: "Inventário · Nogueira", note: "Juntar procuração" },
      { name: "Cobrança · Tech Sul", note: "Audiência em 3 dias" },
    ],
    listRows: [
      { name: "Vieira x Transportes SP", note: "Trabalhista · 2ª vara", urgent: true },
      { name: "Inventário Nogueira", note: "Família · em curso" },
      { name: "Tech Sul x Fornecedor", note: "Cível · cobrança" },
      { name: "Consultoria Prime", note: "Contratos · revisão" },
    ],
    indicatorsTitle: "Panorama do escritório",
    indicatorsNote: "Prazos, andamento processual e honorários.",
    indicators: [
      { group: "Prazos e risco", rows: [["Vencem hoje", "3", "exigem ação"], ["Próximos 7 dias", "11", "na agenda"], ["Casos parados", "9", "há mais de 30 dias"]] },
      { group: "Andamento", rows: [["Movimentações", "12", "para revisar"], ["Audiências", "4", "no mês"], ["Casos ativos", "48", "em curso"]] },
      { group: "Honorários", rows: [["A receber", "R$ 84.300,00", "em aberto"], ["Vencidos", "R$ 19.200,00", "cobrança pendente"], ["Recebido no mês", "R$ 41.700,00", "49% do previsto"]] },
    ],
    groups: [
      { label: "Jurídico", items: [{ label: "Processos", badge: 48 }, { label: "Prazos", badge: 3, danger: true }, { label: "Movimentações", badge: 12 }, { label: "Documentos" }] },
      { label: "Comercial", items: [{ label: "Clientes" }, { label: "Agenda" }, { label: "Consulta DataJud" }] },
      { label: "Escritório", items: [{ label: "Financeiro" }, { label: "Equipe" }, { label: "Configurações" }] },
    ],
    subItems: ["Meu dia", "Prazos críticos"],
  },
  {
    key: "autonomous_seller",
    org: "Studio Nova",
    userName: "Bruno Nova",
    role: "Vendedor autônomo",
    search: "Buscar cliente ou venda",
    dateLabel: "Sábado, 25 de julho",
    greeting: "Bom dia, Bruno.",
    summaryPrefix: "Você tem",
    summaryAlert: "5 prioridades",
    summaryCount: "23 vendas em andamento",
    summarySuffix: "na carteira.",
    secondaryAction: "Novo lembrete",
    primaryAction: "Nova venda",
    timPrompt: "Pergunte ao Tim sobre seus clientes e vendas",
    workspaceLabel: "Visão geral do negócio",
    listNav: "Funil de vendas",
    listLabel: "Negócios em aberto",
    metrics: [
      { icon: MessageCircle, label: "Conversas", value: "87", note: "+12% desde ontem" },
      { icon: TrendingUp, label: "Vendas ganhas", value: "34", note: "+8% desde ontem" },
      { icon: Bell, label: "Lembretes hoje", value: "5", note: "2 atrasados" },
      { icon: Users, label: "Contatos", value: "142", note: "18 sem retorno" },
    ],
    chartLabel: "Vendas da semana",
    chartDays: [30, 45, 39, 72, 55, 64, 83],
    queueLabel: "Quem chamar hoje",
    queue: [
      { name: "Carla Nogueira", note: "Orçamento vence hoje", urgent: true },
      { name: "Igor Batista", note: "Retorno combinado" },
      { name: "Freelab", note: "Aguardando aprovação" },
    ],
    listRows: [
      { name: "Carla Nogueira", note: "Proposta · R$ 12.400", urgent: true },
      { name: "Igor Batista", note: "Negociação · R$ 8.900" },
      { name: "Freelab", note: "Contato · R$ 22.000" },
      { name: "Tech Sul", note: "Fechamento · R$ 5.300" },
    ],
    indicatorsTitle: "Resultado comercial",
    indicatorsNote: "Conversão, ritmo de vendas e carteira.",
    indicators: [
      { group: "Conversão", rows: [["Taxa de conversão", "28%", "dos negócios abertos"], ["Ciclo de vendas", "12 dias", "média do período"], ["Ticket médio", "R$ 9.400", "por venda ganha"]] },
      { group: "Ritmo", rows: [["Vendas ganhas", "34", "+8% desde ontem"], ["Em negociação", "23", "na carteira"], ["Perdidas", "6", "no mês"]] },
      { group: "Relacionamento", rows: [["Contatos", "142", "na base"], ["Sem retorno", "18", "há mais de 7 dias"], ["Lembretes hoje", "5", "2 atrasados"]] },
    ],
    groups: [
      { label: "CRM", items: [{ label: "Contatos", badge: 142 }, { label: "Funil de vendas", badge: 23 }, { label: "Lembretes", badge: 5, danger: true }, { label: "Calendário" }] },
      { label: "Operação", items: [{ label: "Produtos" }, { label: "Pedidos" }, { label: "Pós-venda" }] },
      { label: "Gestão", items: [{ label: "Financeiro" }, { label: "Equipe" }, { label: "Relatórios" }] },
    ],
    subItems: ["Minha operação", "Relatórios"],
  },
];

export const TIM_TROCA = [
  { de: "voce", texto: "Quem eu preciso chamar hoje?" },
  { de: "tim", texto: "Três pessoas. A Carla tem orçamento vencendo hoje, o Igor combinou retorno pra tarde e a Freelab está há 6 dias sem resposta." },
  { de: "voce", texto: "Escreve uma mensagem pra Carla" },
];

export const TIM_SUGESTOES = ["Resuma minha semana", "Quem está travado no funil?", "Quanto fechei no mês?"];

export const CONVERSAS = [
  { nome: "Carla Nogueira", previa: "Consigo fechar até sexta?", hora: "09:12", naoLidas: 2 },
  { nome: "Igor Batista", previa: "Perfeito, combinado então", hora: "08:40" },
  { nome: "Freelab", previa: "Vou levar pro time e retorno", hora: "ontem" },
];

