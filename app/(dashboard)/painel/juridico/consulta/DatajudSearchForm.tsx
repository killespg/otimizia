"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DATAJUD_TRIBUNALS, sortTribunalsByFavorites } from "@/lib/datajud-tribunals";
import type { DatajudProcess } from "@/lib/datajud";
import { IconAlert, IconClock, IconPlus, IconSearch, IconStar } from "../../icons";

// Datas vindas do DataJud nem sempre são um ISO 8601 válido (já vimos
// movimentação sem dataHora) — Intl.DateTimeFormat lança RangeError pra uma
// Invalid Date, o que derrubava a tela inteira. Nunca deixa isso quebrar o
// render; só mostra "Data não informada".
function safeFormat(value: string | null | undefined, format: Intl.DateTimeFormatOptions) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", format).format(date);
}
const dateTime = (value: string | null | undefined) => safeFormat(value, { dateStyle: "short", timeStyle: "short" });
const dateOnly = (value: string | null | undefined) => safeFormat(value, { dateStyle: "long" });

export function DatajudSearchForm({
  initialFavorites = [],
  canManage = false,
  compact = false,
}: {
  initialFavorites?: string[];
  canManage?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [favorites, setFavorites] = useState(initialFavorites);
  const tribunals = sortTribunalsByFavorites(favorites);
  const [tribunalAlias, setTribunalAlias] = useState(tribunals[0]?.alias ?? DATAJUD_TRIBUNALS[0]?.alias ?? "");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [process, setProcess] = useState<DatajudProcess | null>(null);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [addingCase, setAddingCase] = useState(false);

  const isFavorite = favorites.includes(tribunalAlias);

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

  async function toggleFavorite() {
    if (togglingFavorite || !tribunalAlias) return;
    setTogglingFavorite(true);
    try {
      const response = await fetch("/api/law/favorite-tribunal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tribunalAlias }),
      });
      const data = await response.json();
      if (response.ok) {
        setFavorites(data.favoriteTribunals);
        // Sem isso, o cache de navegação do Next pode servir uma versão da
        // página anterior ao favorito numa navegação por link (não um
        // reload completo), fazendo parecer que o favorito "sumiu".
        router.refresh();
      }
    } finally {
      setTogglingFavorite(false);
    }
  }

  async function addToCases() {
    if (!process || addingCase) return;
    setAddingCase(true);
    try {
      const title = process.classe?.nome ? `${process.classe.nome} — ${formatNumero(process.numeroProcesso)}` : undefined;
      const response = await fetch("/api/law/quick-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tribunalAlias, numeroProcesso: process.numeroProcesso, title }),
      });
      const data = await response.json();
      if (response.ok && data.caseId) {
        router.push(`/painel/juridico/processos/${data.caseId}`);
      } else {
        setError(data.error ?? "Não consegui criar o caso.");
      }
    } catch {
      setError("Não consegui criar o caso. Tente de novo.");
    } finally {
      setAddingCase(false);
    }
  }

  return (
    <>
      <section className={compact ? "" : "border border-white/[0.09] bg-[#1e1d22] p-5"}>
        <form onSubmit={search} className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
          <label className="block">
            <span className="label">Tribunal</span>
            <select
              value={tribunalAlias}
              onChange={(event) => setTribunalAlias(event.target.value)}
              className="field mt-1.5"
            >
              {tribunals.map((t) => (
                <option key={t.alias} value={t.alias}>
                  {favorites.includes(t.alias) ? `★ ${t.label}` : t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={togglingFavorite}
              aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar este tribunal"}
              title={isFavorite ? "Remover dos favoritos" : "Favoritar este tribunal"}
              className={
                "grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/[0.1] " +
                (isFavorite ? "bg-violet-400/10 text-violet-300" : "bg-transparent text-white/40")
              }
            >
              <IconStar className="h-5 w-5" filled={isFavorite} />
            </button>
          </div>
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
          <p className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-[#fb7767]">
            <IconAlert className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {!compact && (
          <p className="mt-4 text-[11px] text-white/42">
            Dados públicos do DataJud (CNJ) — cobre praticamente todos os tribunais do país. Clique na estrela pra
            fixar um tribunal no topo da lista.
          </p>
        )}
      </section>

      {process && (
        <section className="overflow-hidden border border-white/[0.09] bg-[#1e1d22]">
          <div className="border-b border-white/[0.08] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-violet-300">{process.classe?.nome ?? "Classe não informada"}</p>
                <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-white">{formatNumero(process.numeroProcesso)}</p>
              </div>
              {canManage && (
                <button type="button" onClick={addToCases} disabled={addingCase} className="btn shrink-0">
                  <IconPlus className="h-4 w-4" />
                  {addingCase ? "Adicionando..." : "Adicionar aos casos"}
                </button>
              )}
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="label">Órgão julgador</dt>
                <dd className="mt-1 text-[12px] font-medium text-white/68">{process.orgaoJulgador?.nome ?? "Não informado"}</dd>
              </div>
              <div>
                <dt className="label">Data de ajuizamento</dt>
                <dd className="mt-1 text-[12px] font-medium text-white/68">
                  {process.dataAjuizamento ? dateOnly(process.dataAjuizamento) : "Não informada"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-[14px] font-semibold text-white">Movimentações</h2>
            <span className="text-[11px] text-white/42">{process.movimentos.length}</span>
          </div>
          {process.movimentos.length === 0 ? (
            <p className="p-5 text-[12px] text-white/45">Nenhuma movimentação retornada pelo DataJud.</p>
          ) : (
            <div className="max-h-[32rem] overflow-y-auto">
              {[...process.movimentos]
                .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
                .map((movimento, index) => (
                  <article key={`${movimento.codigo}-${movimento.dataHora}-${index}`} className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-violet-400/10 text-violet-300">
                      <IconClock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-white/72">{movimento.nome}</p>
                      <p className="mt-1 text-[10px] text-white/38">{dateTime(movimento.dataHora)}</p>
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
