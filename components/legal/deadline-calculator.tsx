"use client";

import { useRef, useState } from "react";
import { Calculator, CalendarCheck2 } from "lucide-react";
import { addBusinessDays } from "@/lib/law-deadline-calc";

export function DeadlineCalculator() {
  const baseDateRef = useRef<HTMLInputElement>(null);
  const daysRef = useRef<HTMLInputElement>(null);
  const [countRecess, setCountRecess] = useState(true);
  const [result, setResult] = useState<ReturnType<typeof addBusinessDays> | null>(null);

  function calculate() {
    const [year, month, day] = (baseDateRef.current?.value ?? "").split("-").map(Number);
    const amount = Number(daysRef.current?.value ?? "15");
    if (!year || !month || !day || !Number.isFinite(amount) || amount < 1) return;
    setResult(addBusinessDays(new Date(year, month - 1, day), amount, { countRecess }));
  }

  const resultLabel = result ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(result.dueDate) : null;

  return <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
    <section>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2"><span className="text-xs font-medium text-od-text-3">Data do evento</span><input ref={baseDateRef} type="date" className="h-11 w-full border-b border-white/[0.12] bg-transparent px-1 text-[13px] text-white/75 outline-none focus:border-od-accent" /></label>
        <label className="space-y-2"><span className="text-xs font-medium text-od-text-3">Quantidade de dias úteis</span><input ref={daysRef} type="number" min={1} max={120} defaultValue="15" className="h-11 w-full border-b border-white/[0.12] bg-transparent px-1 text-[13px] text-white/75 outline-none focus:border-od-accent" /></label>
      </div>
      <label className="mt-6 flex items-center gap-3 text-xs text-od-text-3"><input type="checkbox" checked={countRecess} onChange={(event) => setCountRecess(event.target.checked)} className="accent-od-accent" />Considerar o recesso forense de 20 de dezembro a 20 de janeiro</label>
      <button type="button" onClick={calculate} className="mt-7 inline-flex h-10 items-center gap-2 rounded-[3px] bg-[#7146dc] px-4 text-xs font-semibold text-white"><Calculator size={14} />Calcular prazo</button>
      <p className="mt-5 max-w-xl text-xs leading-relaxed text-od-text-3">A contagem aplica fins de semana, feriados nacionais e, quando marcado, recesso forense. Feriados estaduais, municipais e suspensões específicas do tribunal precisam ser conferidos.</p>
    </section>
    <aside className="border-l border-white/[0.08] pl-7">
      <span className="grid size-9 place-items-center text-od-text-3"><CalendarCheck2 size={20} /></span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-od-text-3">Data estimada</p>
      <p className="mt-2 min-h-16 text-[22px] font-semibold leading-tight text-white/80">{resultLabel ?? "Preencha os dados para calcular"}</p>
      {result ? <div className="mt-6 space-y-2 border-t border-white/[0.08] pt-5 text-xs text-od-text-3"><p>{result.skippedWeekends} dias de fim de semana ignorados</p><p>{result.skippedHolidays} feriados nacionais ignorados</p><p>{result.skippedRecessDays} dias de recesso ignorados</p></div> : null}
    </aside>
  </div>;
}
