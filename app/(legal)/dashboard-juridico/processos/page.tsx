import Link from "next/link";
import { ArrowUpRight, BellRing, ChevronDown, FileCheck2, Filter, Gavel, Plus, Search } from "lucide-react";
import { LegalPage, MetricStrip, PageHeader, PrimaryAction, QuietAction, SectionTitle, StatusTag } from "@/components/legal/legal-ui";

const cases = [
  { id: "mariana-lopes", number: "1008421-22.2026.5.02.0031", client: "Mariana Lopes", subject: "Verbas rescisórias", area: "Trabalhista", court: "TRT-2", owner: "Marina Ribeiro", status: "Ativo", stage: "Instrução", deadline: "Hoje, 10:30", risk: "Alto" },
  { id: "construtora-vale", number: "1028451-17.2026.8.26.0100", client: "Construtora Vale", subject: "Responsabilidade contratual", area: "Cível", court: "TJSP", owner: "Carlos Mendes", status: "Ativo", stage: "Contestação", deadline: "Hoje, 17:00", risk: "Crítico" },
  { id: "paulo-nogueira", number: "5014472-09.2025.8.13.0024", client: "Paulo Nogueira", subject: "Inventário e partilha", area: "Família", court: "TJMG", owner: "Aline Souza", status: "Aguardando", stage: "Perícia", deadline: "21 jul", risk: "Padrão" },
  { id: "comercial-vertice", number: "1102934-41.2025.8.26.0100", client: "Comercial Vértice", subject: "Revisão contratual bancária", area: "Empresarial", court: "TJSP", owner: "Marina Ribeiro", status: "Ativo", stage: "Réplica", deadline: "23 jul", risk: "Padrão" },
  { id: "helena-costa", number: "0008124-33.2026.4.03.6100", client: "Helena Costa", subject: "Benefício previdenciário", area: "Previdenciário", court: "TRF-3", owner: "Aline Souza", status: "Suspenso", stage: "Recurso", deadline: "29 jul", risk: "Baixo" },
];

const movements = [
  { icon: BellRing, title: "Intimação disponibilizada", caseName: "Mariana Lopes × Grupo Atlas", detail: "Prazo de 8 dias para manifestação", court: "TRT-2", time: "há 22 min", tone: "brand" as const },
  { icon: FileCheck2, title: "Petição juntada", caseName: "Comercial Vértice × Banco União", detail: "Manifestação da parte contrária", court: "TJSP", time: "há 1h", tone: "neutral" as const },
  { icon: Gavel, title: "Conclusos para decisão", caseName: "Inventário de Paulo Nogueira", detail: "Autos encaminhados ao magistrado", court: "TJMG", time: "há 3h", tone: "neutral" as const },
  { icon: FileCheck2, title: "Mandado devolvido cumprido", caseName: "Construtora Vale × Município", detail: "Certidão adicionada aos autos", court: "TJMG", time: "ontem", tone: "neutral" as const },
];

function MovementsView() {
  return <LegalPage>
    <PageHeader eyebrow="Jurídico / Monitoramento" title="Movimentações" description="Atualizações processuais capturadas nos tribunais e vinculadas à carteira do escritório." action={<QuietAction icon={Search} href="/painel/juridico/consulta">Consultar processo</QuietAction>} />
    <MetricStrip items={[{ label: "Novas hoje", value: "6", note: "2 não lidas" }, { label: "Intimações", value: "2", tone: "danger" }, { label: "Petições juntadas", value: "1" }, { label: "Casos monitorados", value: "34", tone: "success" }]} />
    <section className="py-8">
      <SectionTitle title="Linha de atualizações" description="Ordenada da ocorrência mais recente para a mais antiga" />
      <div className="border-t border-white/[0.07]">{movements.map(({ icon: Icon, ...item }) => <div key={`${item.title}-${item.caseName}`} className="grid gap-4 border-b border-white/[0.06] py-5 sm:grid-cols-[32px_minmax(0,1fr)_80px_70px] sm:items-center"><span className="grid size-8 place-items-center text-violet-300/65"><Icon size={15} /></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-[12px] font-medium text-white/72">{item.title}</p><StatusTag tone={item.tone}>{item.court}</StatusTag></div><p className="mt-1.5 text-[11px] text-white/42">{item.caseName}</p><p className="mt-1 text-[10px] text-white/27">{item.detail}</p></div><span className="text-[10px] text-white/30">{item.time}</span><button type="button" className="text-left text-[10px] font-medium text-violet-300/65 hover:text-violet-200 sm:text-right">Revisar</button></div>)}</div>
    </section>
  </LegalPage>;
}
export default async function CasesPage(
  props: { searchParams?: Promise<{ responsavel?: string; visao?: string }> }
) {
  const searchParams = await props.searchParams;
  if (searchParams?.visao === "movimentacoes") return <MovementsView />;

  const mine = searchParams?.responsavel === "eu";
  const visibleCases = mine ? cases.filter((item) => item.owner === "Marina Ribeiro") : cases;
  const title = mine ? "Minha carteira" : "Processos";
  const description = mine ? "Processos sob sua responsabilidade direta ou nos quais você participa." : "Carteira processual do escritório, com responsabilidade, risco e próximos atos.";

  return <LegalPage>
    <PageHeader eyebrow={`Jurídico / ${title}`} title={title} description={description} action={<><QuietAction icon={Filter} href={mine ? "/painel/juridico/processos" : "/painel/juridico/processos?responsavel=eu"}>{mine ? "Ver todos" : "Minha carteira"}</QuietAction><PrimaryAction icon={Plus} href={`${mine ? "/painel/juridico/processos?responsavel=eu&" : "/painel/juridico/processos?"}novo=processo`}>Novo processo</PrimaryAction></>} />
    <MetricStrip items={mine ? [{ label: "Sob sua responsabilidade", value: "18", note: "2 com apoio" }, { label: "Com prazo em 7 dias", value: "5", note: "1 hoje", tone: "danger" }, { label: "Aguardando cliente", value: "3" }, { label: "Sem pendências", value: "10", tone: "success" }] : [{ label: "Casos ativos", value: "48", note: "+3 no mês" }, { label: "Com prazo em 7 dias", value: "12", note: "3 hoje", tone: "danger" }, { label: "Sem movimentação há 30 dias", value: "7" }, { label: "Encerrados em julho", value: "9", tone: "success" }]} />

    <section className="py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><SectionTitle title={mine ? "Processos atribuídos a Marina Ribeiro" : "Carteira processual"} description={mine ? "Exibindo somente sua responsabilidade e participação" : "48 processos visíveis conforme seu cargo e participação"} /><div className="flex items-center gap-2 border-b border-white/[0.07] pb-2"><Search size={13} className="text-white/28" /><span className="text-[11px] text-white/30">Buscar nesta carteira</span></div></div>
      <div className="overflow-x-auto"><div className="min-w-[1080px]">
        <div className="grid grid-cols-[1.3fr_1.1fr_.65fr_.55fr_.8fr_.65fr_.65fr_24px] gap-5 border-y border-white/[0.07] px-1 py-3 text-[9px] font-semibold uppercase tracking-[0.09em] text-white/25"><span>Processo / cliente</span><span>Assunto</span><span>Área</span><span>Tribunal</span><span>Responsável</span><span>Fase</span><span>Próximo ato</span><span /></div>
        {visibleCases.map((item) => <Link key={item.id} href={`/painel/juridico/processos/${item.id}`} className="grid grid-cols-[1.3fr_1.1fr_.65fr_.55fr_.8fr_.65fr_.65fr_24px] items-center gap-5 border-b border-white/[0.055] px-1 py-4 hover:bg-white/[0.018]"><div className="min-w-0"><p className="truncate font-mono text-[10px] text-white/34">{item.number}</p><div className="mt-1.5 flex items-center gap-2"><p className="truncate text-[12px] font-medium text-white/78">{item.client}</p>{item.risk === "Crítico" || item.risk === "Alto" ? <span className="size-1.5 rounded-full bg-[#ff7468]" /> : null}</div></div><span className="truncate text-[11px] text-white/44">{item.subject}</span><span className="text-[11px] text-white/42">{item.area}</span><span className="text-[11px] text-white/42">{item.court}</span><span className="text-[11px] text-white/42">{item.owner}</span><StatusTag tone={item.status === "Ativo" ? "brand" : "neutral"}>{item.stage}</StatusTag><span className={`text-[11px] ${item.deadline.startsWith("Hoje") ? "text-[#ff8175]" : "text-white/40"}`}>{item.deadline}</span><ArrowUpRight size={13} className="text-white/22" /></Link>)}
      </div></div>
      <div className="mt-5 flex items-center justify-between"><span className="text-[10px] text-white/28">Exibindo {visibleCases.length} de {mine ? "18" : "48"} processos</span><button type="button" className="inline-flex items-center gap-1 text-[10px] text-white/38">25 por página <ChevronDown size={10} /></button></div>
    </section>
  </LegalPage>;
}
