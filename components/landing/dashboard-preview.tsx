"use client";

import * as React from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileClock,
  Gavel,
  Images,

  MessageCircle,
  Search,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/design-system/logo";

type Metric = { icon: LucideIcon; label: string; value: string; note: string };
type QueueItem = { name: string; note: string; urgent?: boolean };

type Profession = {
  key: string;
  tab: string;
  org: string;
  role: string;
  search: string;
  nav: string[];
  active: string;
  metrics: Metric[];
  chartLabel: string;
  chartDays: number[];
  queueLabel: string;
  queue: QueueItem[];
};

/**
 * Cada aba mostra o painel real daquela profissão, com a linguagem dela: o
 * corretor fala de imóveis e visitas, o escritório de prazos e processos, o
 * vendedor de negócios e lembretes. Uma tela generica com rotulo trocado nao
 * provaria a promessa de que o produto se molda a profissao.
 *
 * São exatamente as três profissões liberadas hoje no cadastro.
 */
const PROFESSIONS: Profession[] = [
  {
    key: "real_estate_broker",
    tab: "Corretor de imóveis",
    org: "Mariana Costa Imóveis",
    role: "Corretor de imóveis",
    search: "Buscar imóvel, bairro ou cidade",
    nav: ["Visão geral", "Carteira de imóveis", "Mapa", "Agenda de visitas", "Vitrines", "Clientes"],
    active: "Visão geral",
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
  },
  {
    key: "law_office",
    tab: "Escritório de advocacia",
    org: "Ribeiro & Associados",
    role: "Escritório de advocacia",
    search: "Buscar caso, cliente ou processo",
    nav: ["Visão geral", "Processos", "Prazos", "Movimentações", "Documentos", "Clientes"],
    active: "Visão geral",
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
  },
  {
    key: "autonomous_seller",
    tab: "Vendedor autônomo",
    org: "Studio Nova",
    role: "Vendedor autônomo",
    search: "Buscar cliente ou venda",
    nav: ["Visão geral", "Contatos", "Funil de vendas", "Lembretes", "Calendário", "Tim"],
    active: "Visão geral",
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
  },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function DashboardPreview() {
  const [activeKey, setActiveKey] = React.useState(PROFESSIONS[0].key);
  const profession = PROFESSIONS.find((item) => item.key === activeKey) ?? PROFESSIONS[0];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Controle segmentado, não pill: o DESIGN.md reserva raio total pra
          círculo de verdade. O trilho é uma superfície, e o selecionado ganha
          a superfície mais alta em vez de cor de fundo cheia. */}
      <div
        role="tablist"
        aria-label="Escolha a profissão"
        className="mx-auto flex w-full max-w-[560px] shrink-0 gap-1 rounded-lg border border-od-border bg-od-bg p-1"
      >
        {PROFESSIONS.map((item) => {
          const selected = item.key === profession.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveKey(item.key)}
              className={`min-w-0 flex-1 truncate rounded px-3 py-2 text-[12px] font-semibold transition-colors ${
                selected ? "bg-od-surface text-od-text" : "text-od-text-3 hover:text-od-text-2"
              }`}
            >
              {item.tab}
            </button>
          );
        })}
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-xl border border-od-border bg-od-muted-surface">
        <div className="hidden w-[190px] shrink-0 flex-col gap-0.5 bg-od-sidebar px-3 py-4 md:flex">
          <div className="mb-3 flex items-center gap-2 px-2">
            <LogoMark size={20} className="shrink-0" />
            <span className="text-[15px] font-extrabold text-white">OtimizIA</span>
          </div>
          <div className="mb-3 px-2">
            <p className="truncate text-[11px] font-semibold text-white/80">{profession.org}</p>
            <p className="truncate text-[10px] text-white/45">{profession.role}</p>
          </div>
          {profession.nav.map((item) => (
            <div
              key={item}
              className={`truncate rounded-xl px-2.5 py-2 text-[12px] ${
                item === profession.active ? "bg-white/[0.075] font-semibold text-white" : "font-medium text-white/45"
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 border-b border-white/[0.12] py-1.5 md:w-64 md:flex-none">
              <Search className="size-3.5 shrink-0 text-white/40" strokeWidth={2} />
              <span className="truncate text-[12px] text-white/40">{profession.search}</span>
            </div>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-white/70">
              {initials(profession.org)}
            </span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.07] border-b border-white/[0.07] sm:grid-cols-4 sm:divide-y-0">
            {profession.metrics.map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="min-w-0 px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3.5 shrink-0 text-od-text-3" strokeWidth={2} />
                  <span className="truncate text-[11px] text-white/55">{label}</span>
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
                    className={`flex-1 rounded-sm transition-all duration-300 ${
                      height === Math.max(...profession.chartDays) ? "bg-od-accent" : "bg-white/[0.13]"
                    }`}
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
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[9px] font-semibold text-white/70">
                      {initials(item.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium text-white">{item.name}</span>
                      <span className="block truncate text-[10px] text-white/45">{item.note}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                        item.urgent ? "bg-[#fb7767]/12 text-[#fca79b]" : "bg-white/[0.07] text-white/60"
                      }`}
                    >
                      {item.urgent ? "Hoje" : "Aberto"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
