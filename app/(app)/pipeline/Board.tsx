"use client";

import { useState, useTransition } from "react";
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/format";
import { moveDeal, deleteDeal } from "../actions";
import { IconCheck, IconGrip, IconTrash } from "../icons";

/* Cor + forma por etapa (nunca só cor — apoio a daltonismo). */
const STAGE_META: Record<
  DealStage,
  { mark: string; head: string; chip?: "won" | "lost" }
> = {
  novo: { mark: "bg-ink-muted", head: "text-ink-soft" },
  em_contato: { mark: "bg-brand-400", head: "text-ink-soft" },
  negociacao: { mark: "bg-honey", head: "text-ink-soft" },
  ganho: { mark: "bg-brand-600", head: "text-brand-700", chip: "won" },
  perdido: { mark: "bg-danger-500", head: "text-danger-700", chip: "lost" },
};

export default function Board({
  initialDeals,
  contactNames,
}: {
  initialDeals: Deal[];
  contactNames: Record<string, string>;
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const boardBusy = isPending || savingId !== null;

  function onDrop(stage: DealStage) {
    setOverStage(null);
    if (!dragId || boardBusy) return;
    const id = dragId;
    const previousStage = deals.find((d) => d.id === id)?.stage;
    setDragId(null);
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    setSavingId(id);
    startTransition(() => {
      void moveDeal(id, stage)
        .catch(() => {
          if (!previousStage) return;
          setDeals((prev) =>
            prev.map((d) => (d.id === id ? { ...d, stage: previousStage } : d))
          );
        })
        .finally(() => setSavingId(null));
    });
  }

  return (
    <div
      aria-busy={boardBusy}
      className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:gap-0 lg:overflow-visible lg:border-l lg:border-t lg:border-line"
    >
      {DEAL_STAGES.map((col) => {
        const meta = STAGE_META[col.key];
        const colDeals = deals.filter((d) => d.stage === col.key);
        const total = colDeals.reduce((s, d) => s + d.value_cents, 0);
        const isOver = overStage === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              if (overStage !== col.key) setOverStage(col.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setOverStage((s) => (s === col.key ? null : s));
            }}
            onDrop={() => onDrop(col.key)}
            className={
              "flex min-w-[80%] shrink-0 snap-start flex-col border border-line transition-colors duration-150 ease-out sm:min-w-[16rem] lg:min-w-0 lg:border-l-0 lg:border-t-0 " +
              (isOver ? "bg-brand-50" : "bg-canvas")
            }
          >
            {/* Cabeçalho da coluna */}
            <div className="border-b border-line bg-surface-2 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={"h-2.5 w-2.5 rounded-sm " + meta.mark}
                    aria-hidden="true"
                  />
                  <h3
                    className={
                      "font-mono text-[11px] font-semibold uppercase tracking-[0.1em] " +
                      meta.head
                    }
                  >
                    {col.label}
                  </h3>
                  {meta.chip === "won" && (
                    <IconCheck className="h-3.5 w-3.5 text-brand-600" />
                  )}
                  {meta.chip === "lost" && (
                    <span
                      className="font-mono text-[11px] font-bold leading-none text-danger-500"
                      aria-hidden="true"
                    >
                      ×
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                  {String(colDeals.length).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] tabular-nums text-ink-muted">
                {formatBRL(total)}
              </p>
            </div>

            {/* Cartões */}
            <div className="enter flex flex-1 flex-col gap-2 p-2.5">
              {colDeals.length === 0 ? (
                <div className="flex flex-1 items-center justify-center border border-dashed border-line py-8 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                  {isOver ? "Soltar" : "Vazio"}
                </div>
              ) : (
                colDeals.map((d) => (
                  <div
                    key={d.id}
                    draggable={!boardBusy}
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    className={
                      "row-link group rounded-sm border border-line bg-surface p-2.5 hover:border-line-strong " +
                      (boardBusy
                        ? "cursor-wait opacity-70"
                        : "cursor-grab active:cursor-grabbing") +
                      " " +
                      (dragId === d.id
                        ? "scale-[0.985] opacity-45 ring-1 ring-brand-400"
                        : "")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <IconGrip className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted/40 transition-colors duration-150 ease-out group-hover:text-ink-muted" />
                        <p className="clip-2 min-w-0 text-safe text-sm font-semibold leading-snug text-ink">
                          {d.title}
                        </p>
                      </div>
                      <form action={deleteDeal} className="shrink-0">
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          type="submit"
                          className="icon-button grid h-6 w-6 place-items-center rounded-sm text-ink-muted/50 hover:bg-danger-50 hover:text-danger-600"
                          title="Excluir venda"
                          aria-label={`Excluir ${d.title}`}
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                    {d.contact_id && contactNames[d.contact_id] && (
                      <p className="mt-1.5 truncate pl-[22px] font-mono text-[11px] text-ink-muted">
                        {contactNames[d.contact_id]}
                      </p>
                    )}
                    <p
                      className={
                        "mt-1 pl-[22px] font-mono text-sm font-semibold tabular-nums " +
                        (col.key === "perdido"
                          ? "text-ink-muted line-through"
                          : col.key === "ganho"
                          ? "text-brand-700"
                          : "text-ink-soft")
                      }
                    >
                      {formatBRL(d.value_cents)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
