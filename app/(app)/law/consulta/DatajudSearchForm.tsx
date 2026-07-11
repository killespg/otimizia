"use client";

import { useState } from "react";
import { DATAJUD_TRIBUNALS } from "@/lib/datajud-tribunals";
import type { DatajudProcess } from "@/lib/datajud";
import { IconAlert, IconClock, IconSearch } from "../../icons";

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const dateOnly = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));

export function DatajudSearchForm() {
  const [tribunalAlias, setTribunalAlias] = useState(DATAJUD_TRIBUNALS[0]?.alias ?? "");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [process, setProcess] = useState<DatajudProcess | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProcess(null);
    try {
      const response = await fetch("/api/law/datajud-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tribunalAlias, numeroProcesso }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não consegui consultar o processo.");
        return;
      }
      setProcess(data.process);
    } catch {
      setError("Não consegui consultar o processo. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="panel p-5">
        <form onSubmit={search} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="label">Tribunal</span>
            <select
              value={tribunalAlias}
              onChange={(event) => setTribunalAlias(event.target.value)}
              className="field mt-1.5"
            >
              {DATAJUD_TRIBUNALS.map((t) => (
                <option key={t.alias} value={t.alias}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Número do processo (CNJ)</span>
            <input
              value={numeroProcesso}
              onChange={(event) => setNumeroProcesso(event.target.value)}
              placeholder="0000832-35.2018.4.01.3202"
              required
              className="field mt-1.5"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={loading} className="btn min-h-11 w-full sm:w-auto">
              <IconSearch className="h-4 w-4" />
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-danger-700">
            <IconAlert className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <p className="mt-4 text-xs font-medium text-ink-muted">
          Dados públicos do DataJud (CNJ) — cobre praticamente todos os tribunais do país. Essa consulta não vincula o
          processo a nenhum caso; pra acompanhar automaticamente, vincule pelo caso jurídico.
        </p>
      </section>

      {process && (
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-5">
            <p className="text-sm font-black text-brand-700">{process.classe?.nome ?? "Classe não informada"}</p>
            <p className="mt-1 text-lg font-black tracking-[-0.02em] text-ink">{formatNumero(process.numeroProcesso)}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="label">Órgão julgador</dt>
                <dd className="mt-1 text-sm font-bold text-ink">{process.orgaoJulgador?.nome ?? "Não informado"}</dd>
              </div>
              <div>
                <dt className="label">Data de ajuizamento</dt>
                <dd className="mt-1 text-sm font-bold text-ink">
                  {process.dataAjuizamento ? dateOnly(process.dataAjuizamento) : "Não informada"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-base font-black text-ink">Movimentações</h2>
            <span className="tag bg-surface-2 text-ink-muted">{process.movimentos.length}</span>
          </div>
          {process.movimentos.length === 0 ? (
            <p className="p-5 text-sm font-medium text-ink-muted">Nenhuma movimentação retornada pelo DataJud.</p>
          ) : (
            <div className="max-h-[32rem] divide-y divide-line overflow-y-auto">
              {[...process.movimentos]
                .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
                .map((movimento, index) => (
                  <article key={`${movimento.codigo}-${movimento.dataHora}-${index}`} className="flex items-start gap-3 px-5 py-4">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                      <IconClock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-ink">{movimento.nome}</p>
                      <p className="mt-1 text-xs font-bold text-ink-muted">{dateTime(movimento.dataHora)}</p>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function formatNumero(numero: string) {
  const digits = numero.replace(/\D/g, "");
  if (digits.length !== 20) return numero;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}
