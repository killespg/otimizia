"use client";

import { useState } from "react";
import type { TimelineEntry } from "@/lib/timeline";
import { IconBot } from "../../icons";

type CitedFact = { fato: string; fonte_index: number };
type ContactSummary = {
  resumo: string;
  pendencias: string[];
  fatos_citaveis: CitedFact[];
  sugestao_resposta: string;
};

// 4.2 (Fase 4): resumo e preparação de atendimento. Cada fato citável
// aponta pro índice de um item real da linha do tempo (fetchada junto na
// mesma resposta) — clicar mostra a fonte, nunca um número solto. A
// sugestão de resposta é só texto pra copiar/editar; nada é enviado
// daqui.
export function ContactSummaryPanel({ contactId }: { contactId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ContactSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [expandedFact, setExpandedFact] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/contact-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não deu para gerar o resumo agora.");
        return;
      }
      setSummary(data.summary);
      setTimeline(data.timeline ?? []);
    } catch {
      setError("Não deu para gerar o resumo agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-[-0.02em] text-ink">Preparar atendimento</h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              Resumo com fatos citáveis da linha do tempo e uma sugestão de resposta pra revisar.
            </p>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="btn shrink-0 press-sm inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <IconBot className="h-4 w-4" />
            {loading ? "Gerando..." : summary ? "Gerar de novo" : "Gerar resumo"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mx-5 mt-4 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-700">
          {error}
        </p>
      )}

      {summary && (
        <div className="space-y-4 p-5">
          <p className="text-sm font-medium leading-relaxed text-ink">{summary.resumo}</p>

          {summary.pendencias.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-warning-700">Pendências</p>
              <ul className="mt-1.5 space-y-1">
                {summary.pendencias.map((p, i) => (
                  <li key={i} className="text-sm font-medium text-ink-soft">
                    • {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.fatos_citaveis.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Fatos citados (clique para ver a fonte)</p>
              <ul className="mt-1.5 space-y-1">
                {summary.fatos_citaveis.map((fact, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setExpandedFact(expandedFact === fact.fonte_index ? null : fact.fonte_index)}
                      className="text-left text-sm font-medium text-ink-soft underline decoration-dotted hover:text-brand-700"
                    >
                      {fact.fato}
                    </button>
                    {expandedFact === fact.fonte_index && timeline[fact.fonte_index] && (
                      <p className="mt-1 rounded-md bg-surface-2 px-2 py-1.5 text-xs font-semibold text-ink-muted">
                        Fonte: {timeline[fact.fonte_index].title}
                        {timeline[fact.fonte_index].detail ? ` — ${timeline[fact.fonte_index].detail}` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.sugestao_resposta && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Sugestão de resposta (revise antes de enviar)</p>
              <p className="mt-1.5 rounded-lg border border-line bg-white p-3 text-sm font-medium text-ink">
                {summary.sugestao_resposta}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
