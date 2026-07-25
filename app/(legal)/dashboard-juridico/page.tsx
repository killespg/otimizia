import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  MoreHorizontal,
  Plus,
} from "lucide-react";

const todayAgenda = [
  { time: "09:00", type: "Reunião", title: "Alinhamento com Mariana Lopes", detail: "Caso trabalhista · sala 02", owner: "Marina", tone: "neutral" },
  { time: "10:30", type: "Audiência", title: "Mariana Lopes × Grupo Atlas", detail: "3ª Vara do Trabalho · videoconferência", owner: "Marina", tone: "danger" },
  { time: "14:00", type: "Prazo interno", title: "Revisão da contestação", detail: "Construtora Vale × Município", owner: "Carlos", tone: "warning" },
  { time: "17:00", type: "Prazo final", title: "Protocolar contestação", detail: "Processo 1028451-17.2026.8.26.0100", owner: "Carlos", tone: "danger" },
];

const movements = [
  { title: "Intimação disponibilizada", caseName: "Mariana Lopes × Grupo Atlas", source: "TRT-2", time: "há 22 min", unread: true },
  { title: "Petição juntada", caseName: "Comercial Vértice × Banco União", source: "TJSP", time: "há 1h", unread: true },
  { title: "Conclusos para decisão", caseName: "Inventário de Paulo Nogueira", source: "TJSP", time: "há 3h", unread: false },
  { title: "Mandado devolvido cumprido", caseName: "Construtora Vale × Município", source: "TJMG", time: "ontem", unread: false },
];

const cases = [
  { number: "1008421-22.2026.5.02.0031", client: "Mariana Lopes", subject: "Verbas rescisórias", court: "TRT-2", owner: "Marina R.", stage: "Instrução", next: "Hoje, 10:30", urgent: true },
  { number: "1028451-17.2026.8.26.0100", client: "Construtora Vale", subject: "Responsabilidade contratual", court: "TJSP", owner: "Carlos M.", stage: "Contestação", next: "Hoje, 17:00", urgent: true },
  { number: "5014472-09.2025.8.13.0024", client: "Paulo Nogueira", subject: "Inventário e partilha", court: "TJMG", owner: "Aline S.", stage: "Perícia", next: "21 jul", urgent: false },
  { number: "1102934-41.2025.8.26.0100", client: "Comercial Vértice", subject: "Revisão contratual bancária", court: "TJSP", owner: "Marina R.", stage: "Réplica", next: "23 jul", urgent: false },
];

function SummaryItem({ label, value, note, urgent = false }: { label: string; value: string; note: string; urgent?: boolean }) {
  return (
    <div className="min-w-0 border-t border-white/[0.07] py-6 sm:border-l sm:border-t-0 sm:px-7 sm:first:border-l-0 sm:first:pl-0">
      <div className="flex items-baseline gap-2.5"><span className={`text-[28px] font-semibold tracking-[-0.025em] ${urgent ? "text-[#ff8175]" : "text-white"}`}>{value}</span><span className="text-[12px] text-white/34">{note}</span></div>
      <p className="mt-1.5 text-[12px] font-medium text-white/48">{label}</p>
    </div>
  );
}
function StatusDot({ tone }: { tone: string }) {
  return <span className={`size-1.5 shrink-0 rounded-full ${tone === "danger" ? "bg-[#ff7468]" : tone === "warning" ? "bg-amber-400" : "bg-white/25"}`} />;
}

export default function LegalDashboardPage() {
  return (
    <main className="mx-auto w-full max-w-[1560px] px-5 pb-24 pt-7 md:px-9 md:pt-9 lg:pb-12">
            <section className="flex flex-col gap-5 border-b border-white/[0.08] pb-7 md:flex-row md:items-end md:justify-between">
              <div><p className="text-[12px] text-white/32">Escritório / Visão geral</p><div className="mt-3 flex items-baseline gap-4"><h1 className="text-[28px] font-semibold tracking-[-0.025em] text-white">Painel jurídico</h1><span className="text-[11px] text-white/32">18 jul 2026</span></div></div>
              <div className="flex flex-wrap items-center gap-1"><Link href="/painel/juridico/prazos" className="inline-flex h-9 items-center gap-2 px-3 text-[11px] font-medium text-white/48 hover:text-white/75"><CalendarDays size={13} />Agenda do escritório<ChevronDown size={11} /></Link><span className="mx-1 hidden h-4 w-px bg-white/[0.08] sm:block" /><Link href="/painel/juridico?novo=processo" className="inline-flex h-9 items-center gap-2 rounded-[3px] bg-[#7146dc] px-3.5 text-[11px] font-semibold text-white hover:bg-[#8055e8]"><Plus size={13} />Novo registro</Link></div>
            </section>

            <section className="grid grid-cols-2 py-1 sm:grid-cols-4">
              <SummaryItem label="Audiências hoje" value="2" note="1 online" />
              <SummaryItem label="Prazos finais" value="3" note="até 18h" urgent />
              <SummaryItem label="Movimentações novas" value="6" note="2 não lidas" />
              <SummaryItem label="Tarefas pendentes" value="11" note="4 da equipe" />
            </section>

            <section className="grid border-y border-white/[0.08] xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.75fr)]">
              <div className="py-7 xl:border-r xl:border-white/[0.08] xl:pr-8">
                <div className="mb-6 flex items-center justify-between"><div><h2 className="text-[15px] font-semibold text-white">Agenda crítica</h2><p className="mt-1.5 text-[12px] text-white/34">Compromissos e prazos que exigem ação hoje</p></div><Link href="/painel/juridico/prazos" className="text-[12px] text-white/38 hover:text-white/70">Abrir agenda</Link></div>
                <div>
                  {todayAgenda.map((item) => (
                    <Link key={`${item.time}-${item.title}`} href="/painel/juridico/prazos" className="group grid w-full grid-cols-[52px_minmax(0,1fr)] gap-4 border-t border-white/[0.06] py-4 text-left first:border-t-0 md:grid-cols-[62px_94px_minmax(0,1fr)_96px] md:items-center">
                      <span className="font-mono text-[12px] text-white/42">{item.time}</span>
                      <span className="hidden items-center gap-2 text-[11px] font-medium text-white/42 md:flex"><StatusDot tone={item.tone} />{item.type}</span>
                      <span className="min-w-0"><span className="block truncate text-[13px] font-medium text-white/82 group-hover:text-white">{item.title}</span><span className="mt-1 block truncate text-[11px] text-white/34">{item.detail}</span></span>
                      <span className="hidden justify-self-end text-[11px] text-white/38 md:block">{item.owner}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/[0.08] py-7 xl:border-t-0 xl:pl-8">
                <div className="mb-6 flex items-center justify-between"><div><h2 className="text-[15px] font-semibold text-white">Movimentações</h2><p className="mt-1.5 text-[12px] text-white/34">Atualizações capturadas nos tribunais</p></div><span className="text-[11px] text-white/28">DataJud</span></div>
                <div>
                  {movements.map((item) => (
                    <Link key={`${item.title}-${item.caseName}`} href="/painel/juridico/processos?visao=movimentacoes" className="group flex w-full gap-3.5 border-t border-white/[0.06] py-4 text-left first:border-t-0">
                      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.unread ? "bg-od-accent" : "bg-white/18"}`} />
                      <span className="min-w-0 flex-1"><span className="block text-[12px] font-medium text-white/72 group-hover:text-white">{item.title}</span><span className="mt-1 block truncate text-[11px] text-white/34">{item.caseName}</span></span>
                      <span className="shrink-0 text-right"><span className="block text-[10px] font-medium text-white/32">{item.source}</span><span className="mt-1 block text-[10px] text-white/24">{item.time}</span></span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="py-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-[15px] font-semibold text-white">Processos em acompanhamento</h2><p className="mt-1.5 text-[12px] text-white/34">Ordenados pelo próximo compromisso</p></div><div className="flex items-center gap-1 border-b border-white/[0.07]"><Link href="/painel/juridico/processos" className="border-b border-od-accent px-4 py-2.5 text-[11px] font-semibold text-white">Todos</Link><Link href="/painel/juridico/processos?responsavel=eu" className="px-4 py-2.5 text-[11px] text-white/34">Minha carteira</Link><Link href="/painel/juridico/prazos" className="px-4 py-2.5 text-[11px] text-white/34">Com prazo</Link></div></div>
              <div className="overflow-x-auto">
                <div className="min-w-[820px]">
                  <div className="grid grid-cols-[1.25fr_1.25fr_.55fr_.7fr_.7fr_.65fr_24px] gap-5 border-y border-white/[0.07] px-1 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/26"><span>Processo / cliente</span><span>Assunto</span><span>Tribunal</span><span>Responsável</span><span>Fase</span><span>Próximo ato</span><span /></div>
                  {cases.map((item) => (
                    <div key={item.number} className="grid grid-cols-[1.25fr_1.25fr_.55fr_.7fr_.7fr_.65fr_24px] items-center gap-5 border-b border-white/[0.055] px-1 py-4 hover:bg-white/[0.018]">
                      <div className="min-w-0"><p className="truncate font-mono text-[11px] text-white/38">{item.number}</p><p className="mt-1.5 truncate text-[12px] font-medium text-white/78">{item.client}</p></div><span className="truncate text-[11px] text-white/46">{item.subject}</span><span className="text-[11px] font-medium text-white/46">{item.court}</span><span className="text-[11px] text-white/46">{item.owner}</span><span className="w-fit rounded border border-white/[0.07] px-2 py-1 text-[10px] text-white/45">{item.stage}</span><span className={`flex items-center gap-1.5 text-[11px] ${item.urgent ? "font-medium text-[#ff8175]" : "text-white/42"}`}>{item.urgent ? <AlertTriangle size={11} /> : null}{item.next}</span><Link href="/painel/juridico/processos" aria-label={`Abrir ${item.client}`} className="text-white/26 hover:text-white/60"><MoreHorizontal size={16} /></Link>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/painel/juridico/processos" className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-medium text-white/38 hover:text-white/70">Ver carteira completa <ArrowUpRight size={11} /></Link>
            </section>

            <section className="grid border-y border-white/[0.08] md:grid-cols-3">
              <div className="flex items-center gap-3 py-4 md:pr-5"><CircleDollarSign size={16} className="text-white/28" /><div><p className="text-[10px] text-white/34">Recebíveis contratados</p><p className="mt-1 text-[14px] font-semibold text-white/78">R$ 84.500 <span className="ml-1 text-[9px] font-normal text-white/28">12 parcelas</span></p></div></div>
              <div className="flex items-center gap-3 border-t border-white/[0.07] py-4 md:border-l md:border-t-0 md:px-5"><Check size={16} className="text-emerald-400/60" /><div><p className="text-[10px] text-white/34">Recebido em julho</p><p className="mt-1 text-[14px] font-semibold text-white/78">R$ 38.200 <span className="ml-1 text-[9px] font-normal text-emerald-300/50">+9,4%</span></p></div></div>
              <div className="flex items-center gap-3 border-t border-white/[0.07] py-4 md:border-l md:border-t-0 md:pl-5"><Clock3 size={16} className="text-[#ff8175]/70" /><div><p className="text-[10px] text-white/34">Recebíveis vencidos</p><p className="mt-1 text-[14px] font-semibold text-[#ff8175]">R$ 12.800 <span className="ml-1 text-[9px] font-normal text-white/28">4 cobranças</span></p></div></div>
            </section>
    </main>
  );
}
