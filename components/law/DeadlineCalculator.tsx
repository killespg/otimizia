"use client";

import { useState } from "react";
import { addBusinessDays } from "@/lib/law-deadline-calc";

function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Calculadora embutida no formulário de prazo: roda inteiramente no
// navegador (sem chamada de rede) e só preenche o campo due_at já
// existente — quem envia o formulário ainda precisa revisar e confirmar,
// nada é criado automaticamente a partir disto.
export function DeadlineCalculator({ defaultValue = "" }: { defaultValue?: string }) {
  const [dueAt, setDueAt] = useState(defaultValue);
  const [baseDate, setBaseDate] = useState("");
  const [days, setDays] = useState("15");
  const [countRecess, setCountRecess] = useState(true);
  const [breakdown, setBreakdown] = useState<string | null>(null);

  function calculate() {
    if (!baseDate) return;
    const [year, month, day] = baseDate.split("-").map(Number);
    const n = Number(days);
    if (!Number.isFinite(n) || n <= 0) return;
    const result = addBusinessDays(new Date(year, month - 1, day), n, { countRecess });
    result.dueDate.setHours(23, 59, 0, 0);
    setDueAt(toDateTimeLocal(result.dueDate));
    const parts: string[] = [];
    if (result.skippedWeekends) parts.push(`${result.skippedWeekends} dia(s) de fim de semana`);
    if (result.skippedHolidays) parts.push(`${result.skippedHolidays} feriado(s)`);
    if (result.skippedRecessDays) parts.push(`${result.skippedRecessDays} dia(s) de recesso forense`);
    setBreakdown(parts.length ? `Pulou ${parts.join(", ")}.` : "Nenhum dia útil pulado no intervalo.");
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="label" htmlFor="deadline-due-at">
          Data e hora do prazo<span className="text-danger-600"> *</span>
        </label>
        <input
          id="deadline-due-at"
          name="due_at"
          type="datetime-local"
          required
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="field mt-1.5"
        />
      </div>
      <details className="rounded-lg border border-line bg-white p-3">
        <summary className="cursor-pointer text-xs font-black text-brand-700">Calcular prazo em dias úteis (CPC)</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="deadline-calc-base">Data do evento</label>
            <input id="deadline-calc-base" type="date" value={baseDate} onChange={(event) => setBaseDate(event.target.value)} className="field mt-1.5" />
          </div>
          <div>
            <label className="label" htmlFor="deadline-calc-days">Dias úteis</label>
            <input id="deadline-calc-days" type="number" min={1} max={120} value={days} onChange={(event) => setDays(event.target.value)} className="field mt-1.5" />
          </div>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs font-bold text-ink-muted">
          <input type="checkbox" checked={countRecess} onChange={(event) => setCountRecess(event.target.checked)} />
          Considerar recesso forense (20/dez a 20/jan)
        </label>
        <button type="button" onClick={calculate} className="btn-soft mt-2 min-h-9 w-full text-xs">
          Calcular e preencher acima
        </button>
        {breakdown && (
          <p className="mt-2 text-xs font-medium text-ink-muted">
            {breakdown} Confira sempre no processo — isto é uma sugestão, não o prazo oficial.
          </p>
        )}
      </details>
    </div>
  );
}
