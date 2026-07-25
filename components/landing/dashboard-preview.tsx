"use client";

import * as React from "react";
import {
  Bell,
  Building2,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  FileClock,
  Gavel,
  Images,
  MessageCircle,
  Pin,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/design-system/logo";

type Metric = { icon: LucideIcon; label: string; value: string; note: string };
type Row = { name: string; note: string; urgent?: boolean };
type Screen = "dashboard" | "tim" | "whatsapp" | "list";

type Profession = {
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
const PROFESSIONS: Profession[] = [
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

const TIM_TROCA = [
  { de: "voce", texto: "Quem eu preciso chamar hoje?" },
  { de: "tim", texto: "Três pessoas. A Carla tem orçamento vencendo hoje, o Igor combinou retorno pra tarde e a Freelab está há 6 dias sem resposta." },
  { de: "voce", texto: "Escreve uma mensagem pra Carla" },
];

const TIM_SUGESTOES = ["Resuma minha semana", "Quem está travado no funil?", "Quanto fechei no mês?"];

const CONVERSAS = [
  { nome: "Carla Nogueira", previa: "Consigo fechar até sexta?", hora: "09:12", naoLidas: 2 },
  { nome: "Igor Batista", previa: "Perfeito, combinado então", hora: "08:40" },
  { nome: "Freelab", previa: "Vou levar pro time e retorno", hora: "ontem" },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

// Classe montada em runtime (`size-${n}`) nao existe pro Tailwind, que so
// enxerga literais no codigo. Duas variantes explicitas.
function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span className={`grid ${large ? "size-7 text-[10px]" : "size-6 text-[9px]"} shrink-0 place-items-center rounded-full bg-white/[0.08] font-semibold text-white/70`}>
      {initials(name)}
    </span>
  );
}

function NavRow({ label, current, badge, danger, pinned, onClick }: { label: string; current: boolean; badge?: number; danger?: boolean; pinned?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[12px] transition-colors ${
        current ? "bg-white/[0.075] font-semibold text-white" : "font-medium text-white/45 hover:bg-white/[0.04] hover:text-white/75"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {pinned ? <Pin className="size-2.5 shrink-0 text-white/35" strokeWidth={2} /> : null}
      {typeof badge === "number" ? (
        <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${danger ? "text-[#fb7767]" : "text-white/60"}`}>{badge}</span>
      ) : null}
    </button>
  );
}

export function DashboardPreview() {
  const [professionIndex, setProfessionIndex] = React.useState(0);
  const [screen, setScreen] = React.useState<Screen>("dashboard");
  const [navLabel, setNavLabel] = React.useState("Visão geral");
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const profession = PROFESSIONS[professionIndex];

  const topItems: Array<{ label: string; screen: Screen; pinned?: boolean }> = [
    { label: "Visão geral", screen: "dashboard" },
    { label: "Tim", screen: "tim" },
    { label: "WhatsApp", screen: "whatsapp", pinned: true },
  ];

  function open(item: { label: string; screen: Screen }) {
    setScreen(item.screen);
    setNavLabel(item.label);
  }

  // Ciclar no clique escondia as outras profissoes: sem lista visivel, quem
  // olha nao sabe que existem. Abre igual ao WorkspaceSwitcher do produto.
  function chooseProfession(index: number) {
    setProfessionIndex(index);
    setScreen("dashboard");
    setNavLabel("Visão geral");
    setSwitcherOpen(false);
  }

  return (
    <div className="relative flex h-full overflow-hidden rounded-xl border border-od-border bg-od-muted-surface">
      <div className="hidden w-[190px] shrink-0 flex-col gap-0.5 bg-od-sidebar px-3 py-4 md:flex">
        <div className="mb-3 flex items-center gap-2 px-2">
          <LogoMark size={20} className="shrink-0" />
          <span className="text-[15px] font-extrabold text-white">OtimizIA</span>
        </div>

        {/* Onde o WorkspaceSwitcher vive no produto. Aqui ele troca a profissão
            inteira, pra quem explora ver o painel de cada uma sem abas por fora
            do card. */}
        <div className="relative mb-3">
          <button
            type="button"
            onClick={() => setSwitcherOpen((open) => !open)}
            aria-expanded={switcherOpen}
            className="flex w-full items-center gap-2 rounded-xl border border-white/[0.07] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-white/85">{profession.org}</span>
              <span className="block truncate text-[10px] text-white/45">{profession.role}</span>
            </span>
            <ChevronsUpDown className="size-3 shrink-0 text-white/40" strokeWidth={2} />
          </button>
          {switcherOpen ? (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-od-border bg-od-surface py-1">
              {PROFESSIONS.map((item, index) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => chooseProfession(index)}
                    className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-white/[0.06] ${index === professionIndex ? "font-semibold text-white" : "text-white/60"}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.role}</span>
                    {index === professionIndex ? <Check className="size-3 shrink-0 text-od-accent" strokeWidth={2.5} /> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {topItems.map((item) => (
          <NavRow
            key={item.label}
            label={item.label}
            current={navLabel === item.label}
            pinned={item.pinned}
            onClick={() => open(item)}
          />
        ))}
        {navLabel === "Visão geral" ? (
          <div className="mx-3.5 mb-1 flex flex-col gap-0.5 border-l border-white/[0.08] pl-2.5">
            {profession.subItems.map((sub, index) => (
              <span
                key={sub}
                className={`truncate rounded-xl px-2 py-1 text-[11px] ${index === 0 ? "bg-white/[0.055] font-medium text-white" : "text-white/42"}`}
              >
                {sub}
              </span>
            ))}
          </div>
        ) : null}

        {profession.groups.map((group) => (
          <div key={group.label} className="mt-2">
            <p className="px-2 py-1 text-[10px] font-medium text-white/34">{group.label}</p>
            {group.items.map((item) => (
              <NavRow
                key={item.label}
                label={item.label}
                badge={item.badge}
                danger={item.danger}
                current={navLabel === item.label}
                onClick={() => { setScreen("list"); setNavLabel(item.label); }}
              />
            ))}
          </div>
        ))}

        <div className="mt-auto border-t border-white/[0.06] pt-2">
          <NavRow label="Configurações" current={false} onClick={() => { setScreen("list"); setNavLabel("Configurações"); }} />
          <div className="flex items-center gap-2 px-2.5 py-2">
            <Avatar name={profession.userName} />
            <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">{profession.userName}</span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 border-b border-white/[0.12] py-1.5 md:w-64 md:flex-none">
            <Search className="size-3.5 shrink-0 text-white/40" strokeWidth={2} />
            <span className="truncate text-[12px] text-white/40">{profession.search}</span>
          </div>
          <Avatar name={profession.org} large />
        </div>

        {screen === "tim" ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
            <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5">
              {TIM_TROCA.map((msg, index) => (
                <div key={index} className={`flex ${msg.de === "voce" ? "justify-end" : "justify-start"}`}>
                  <p className={`max-w-[78%] rounded-lg px-3 py-2 text-[11px] leading-relaxed ${msg.de === "voce" ? "bg-od-accent text-white" : "bg-white/[0.06] text-white/80"}`}>
                    {msg.texto}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TIM_SUGESTOES.map((item) => (
                <span key={item} className="rounded border border-od-border px-2 py-1 text-[10px] text-white/55">{item}</span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-od-border px-3 py-2">
              <Sparkles className="size-3.5 shrink-0 text-od-accent" strokeWidth={2} />
              <span className="flex-1 truncate text-[11px] text-white/35">Pergunte ao Tim...</span>
            </div>
          </div>
        ) : screen === "whatsapp" ? (
          <div className="grid min-h-0 flex-1 md:grid-cols-[210px_1fr] md:divide-x md:divide-white/[0.07]">
            <ul className="hidden flex-col md:flex">
              {CONVERSAS.map((item, index) => (
                <li key={item.nome} className={`flex items-start gap-2 border-b border-white/[0.06] px-3 py-2.5 ${index === 0 ? "bg-white/[0.05]" : ""}`}>
                  <Avatar name={item.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium text-white">{item.nome}</span>
                    <span className="block truncate text-[10px] text-white/45">{item.previa}</span>
                  </span>
                  <span className="shrink-0 text-[9px] text-white/35">{item.hora}</span>
                  {item.naoLidas ? (
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-od-accent text-[9px] font-bold text-white">{item.naoLidas}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex min-h-0 flex-col justify-end gap-2.5 px-4 py-4">
              <p className="max-w-[78%] rounded-lg bg-white/[0.06] px-3 py-2 text-[11px] text-white/80">Consigo fechar até sexta?</p>
              <p className="ml-auto max-w-[78%] rounded-lg bg-od-accent px-3 py-2 text-[11px] text-white">Consegue sim, Carla. Te mando a proposta ainda hoje.</p>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-od-border px-3 py-2">
                <MessageCircle className="size-3.5 shrink-0 text-white/35" strokeWidth={2} />
                <span className="flex-1 truncate text-[11px] text-white/35">Escrever mensagem</span>
              </div>
            </div>
          </div>
        ) : screen === "list" ? (
          <div className="min-h-0 flex-1 px-4 py-4">
            <p className="text-[11px] font-medium text-white/45">{navLabel === profession.listNav ? profession.listLabel : navLabel}</p>
            <ul className="mt-2 divide-y divide-white/[0.07]">
              {profession.listRows.map((row) => (
                <li key={row.name} className="flex items-center gap-2.5 py-2.5">
                  <Avatar name={row.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium text-white">{row.name}</span>
                    <span className="block truncate text-[10px] text-white/45">{row.note}</span>
                  </span>
                  {row.urgent ? (
                    <span className="shrink-0 rounded bg-[#fb7767]/12 px-1.5 py-0.5 text-[9px] font-semibold text-[#fca79b]">Atenção</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-3 pt-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/38">
                  <CalendarDays className="size-3" strokeWidth={2} />
                  {profession.dateLabel}
                </p>
                <p className="mt-1.5 text-[19px] font-extrabold tracking-[-0.01em] text-white">{profession.greeting}</p>
                <p className="mt-1 text-[11px] text-white/55">
                  {profession.summaryPrefix}{" "}
                  <strong className="font-semibold text-[#fca79b]">{profession.summaryAlert}</strong>{" "}
                  e <strong className="font-semibold text-white">{profession.summaryCount}</strong>{" "}
                  {profession.summarySuffix}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <span className="rounded border border-od-border px-2.5 py-1.5 text-[10px] font-semibold text-white/70">{profession.secondaryAction}</span>
                <span className="rounded bg-od-accent px-2.5 py-1.5 text-[10px] font-semibold text-white">{profession.primaryAction}</span>
              </div>
            </div>

            <div className="mx-4 flex items-center gap-2 border-y border-white/[0.07] py-2.5">
              <Sparkles className="size-3.5 shrink-0 text-od-accent" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate text-[11px] text-white/52">{profession.timPrompt}</span>
              <ArrowRight className="size-3 shrink-0 text-white/25" strokeWidth={2} />
            </div>

            <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-3">
              <div>
                <p className="text-[10px] font-medium text-white/38">Área de trabalho</p>
                <p className="text-[12px] font-semibold text-white">{profession.workspaceLabel}</p>
              </div>
              <span className="rounded border border-od-border px-2 py-1 text-[9px] font-semibold text-white/60">Personalizar painel</span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.07] border-y border-white/[0.07] sm:grid-cols-4 sm:divide-y-0">
              {profession.metrics.map(({ icon: Icon, label, value, note }) => (
                <div key={label} className="min-w-0 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded bg-white/[0.06]">
                      <Icon className="size-3 text-od-text-2" strokeWidth={2} />
                    </span>
                    <span className="truncate text-[10px] text-white/55">{label}</span>
                  </div>
                  <p className="mt-1.5 truncate text-[17px] font-bold text-white">{value}</p>
                  <p className="mt-0.5 truncate text-[10px] text-white/40">{note}</p>
                </div>
              ))}
            </div>

            <div className="grid min-h-0 flex-1 md:grid-cols-[1.3fr_1fr] md:divide-x md:divide-white/[0.07]">
              <div className="px-4 py-4">
                <p className="text-[11px] font-medium text-white/45">{profession.chartLabel}</p>
                <div className="mt-3 flex items-end gap-1.5" aria-hidden="true">
                  {profession.chartDays.map((height, index) => (
                    <span
                      key={index}
                      className={`flex-1 rounded-sm ${height === Math.max(...profession.chartDays) ? "bg-od-accent" : "bg-white/[0.13]"}`}
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-white/35">
                  {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => <span key={day}>{day}</span>)}
                </div>
              </div>

              <div className="px-4 py-4">
                <p className="text-[11px] font-medium text-white/45">{profession.queueLabel}</p>
                <ul className="mt-2 divide-y divide-white/[0.07]">
                  {profession.queue.map((item) => (
                    <li key={item.name} className="flex items-center gap-2.5 py-2">
                      <Avatar name={item.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium text-white">{item.name}</span>
                        <span className="block truncate text-[10px] text-white/45">{item.note}</span>
                      </span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${item.urgent ? "bg-[#fb7767]/12 text-[#fca79b]" : "bg-white/[0.07] text-white/60"}`}>
                        {item.urgent ? "Hoje" : "Aberto"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-white/[0.07] px-4 py-3">
              <p className="text-[12px] font-semibold text-white">{profession.indicatorsTitle}</p>
              <p className="mt-0.5 text-[10px] text-white/45">{profession.indicatorsNote}</p>
              <div className="mt-3 grid gap-x-5 gap-y-3 md:grid-cols-3">
                {profession.indicators.map(({ group, rows }) => (
                  <div key={group} className="min-w-0">
                    <p className="text-[10px] font-medium text-white/45">{group}</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {rows.map(([label, value, note]) => (
                        <li key={label} className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] text-white/70">{label}</span>
                            <span className="block truncate text-[9px] text-white/35">{note}</span>
                          </span>
                          <span className="shrink-0 text-[11px] font-semibold text-white">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
