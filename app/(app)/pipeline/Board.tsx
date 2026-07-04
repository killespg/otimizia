"use client";

import { useEffect, useState, useTransition } from "react";
import { PendingButton } from "@/components/PendingButton";
import type { FieldSpec } from "@/lib/professions";
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/format";
import { moveDeal, deleteDeal } from "../actions";
import { IconCheck, IconChevronRight, IconGrip, IconTrash } from "../icons";

function firstDetail(details: Record<string, string> | undefined, fields: FieldSpec[]) {
  if (!details) return null;
  for (const field of fields) {
    const value = details[field.key];
    if (value) return `${field.label}: ${value}`;
  }
  return null;
}

const STAGE_META: Record<
  DealStage,
  { dot: string; chip: string; empty: string }
> = {
  novo: {
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700",
    empty: "Novas vendas entram aqui.",
  },
  em_contato: {
    dot: "bg-brand-500",
    chip: "bg-brand-50 text-brand-700",
    empty: "Sem contato em aberto.",
  },
  negociacao: {
    dot: "bg-pink-500",
    chip: "bg-pink-50 text-pink-700",
    empty: "Nenhuma proposta agora.",
  },
  ganho: {
    dot: "bg-success-500",
    chip: "bg-success-50 text-success-700",
    empty: "Vendas ganhas aparecem aqui.",
  },
  perdido: {
    dot: "bg-danger-500",
    chip: "bg-danger-50 text-danger-700",
    empty: "Sem perdas registradas.",
  },
};

export default function Board({
  initialDeals,
  contactNames,
  stages,
  dealFields = [],
}: {
  initialDeals: Deal[];
  contactNames: Record<string, string>;
  stages?: Record<DealStage, { label: string; empty: string }>;
  dealFields?: FieldSpec[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [canDrag, setCanDrag] = useState(true);
  const [isPending, startTransition] = useTransition();
  const boardBusy = isPending || savingId !== null;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const isTouchOnly =
      window.matchMedia("(pointer: coarse)").matches &&
      !window.matchMedia("(pointer: fine)").matches;
    if (isTouchOnly) setCanDrag(false);
  }, []);

  function commitMove(id: string, stage: DealStage) {
    if (boardBusy) return;
    const previousStage = deals.find((deal) => deal.id === id)?.stage;
    if (!previousStage || previousStage === stage) return;

    setDeals((prev) =>
      prev.map((deal) => (deal.id === id ? { ...deal, stage } : deal))
    );
    setSavingId(id);

    startTransition(() => {
      void moveDeal(id, stage)
        .catch(() => {
          setDeals((prev) =>
            prev.map((deal) =>
              deal.id === id ? { ...deal, stage: previousStage } : deal
            )
          );
        })
        .finally(() => setSavingId(null));
    });
  }

  function onDrop(stage: DealStage) {
    setOverStage(null);
    if (!dragId || boardBusy) return;
    const id = dragId;
    setDragId(null);
    commitMove(id, stage);
  }

  return (
    <div
      aria-busy={boardBusy}
      className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-5 xl:overflow-visible"
    >
      {DEAL_STAGES.map((stage) => {
        const meta = STAGE_META[stage.key];
        const stageCopy = stages?.[stage.key] ?? {
          label: stage.label,
          empty: meta.empty,
        };
        const stageDeals = deals.filter((deal) => deal.stage === stage.key);
        const total = stageDeals.reduce((sum, deal) => sum + deal.value_cents, 0);
        const isOver = overStage === stage.key;

        return (
          <section
            key={stage.key}
            onDragOver={(event) => {
              event.preventDefault();
              if (overStage !== stage.key) setOverStage(stage.key);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setOverStage((current) => (current === stage.key ? null : current));
              }
            }}
            onDrop={() => onDrop(stage.key)}
            className={
              "panel flex min-w-[82%] shrink-0 snap-start flex-col overflow-hidden transition-colors duration-200 sm:min-w-[20rem] xl:min-w-0 " +
              (isOver ? "border-brand-300 bg-brand-50" : "")
            }
          >
            <header className="border-b border-line bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  <h2 className="text-sm font-black text-ink">{stageCopy.label}</h2>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-xs font-black ${meta.chip}`}>
                  {String(stageDeals.length).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-2 text-sm font-black tabular-nums text-ink">
                {formatBRL(total)}
              </p>
            </header>

            <div className="enter flex min-h-[22rem] flex-1 flex-col gap-3 bg-[#f8fbff] p-3">
              {stageDeals.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center">
                  <p className="text-sm font-black text-ink">
                    {isOver ? "Solte aqui" : "Vazio"}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-ink-muted">
                    {stageCopy.empty}
                  </p>
                </div>
              ) : (
                stageDeals.map((deal) => {
                  const menuOpen = menuId === deal.id;
                  const otherStages = DEAL_STAGES.filter((s) => s.key !== stage.key);

                  return (
                    <article
                      key={deal.id}
                      draggable={canDrag && !boardBusy}
                      onDragStart={() => setDragId(deal.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStage(null);
                      }}
                      className={
                        "row-link group rounded-lg border border-line bg-white p-3 shadow-[0_14px_34px_-28px_rgba(21,19,46,0.72)] hover:border-brand-200 " +
                        (boardBusy ? "cursor-wait opacity-70" : canDrag ? "cursor-grab active:cursor-grabbing" : "") +
                        " " +
                        (dragId === deal.id ? "scale-[0.985] opacity-45 ring-2 ring-brand-300" : "")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <IconGrip
                            className={
                              "mt-0.5 h-4 w-4 shrink-0 text-ink-muted/45 transition-colors duration-150 group-hover:text-brand-700 " +
                              (canDrag ? "" : "hidden sm:block")
                            }
                          />
                          <div className="min-w-0">
                            <p className="clip-2 text-safe text-sm font-black leading-snug text-ink">
                              {deal.title}
                            </p>
                            {deal.contact_id && contactNames[deal.contact_id] && (
                              <p className="mt-1 truncate text-xs font-bold text-ink-muted">
                                {contactNames[deal.contact_id]}
                              </p>
                            )}
                            {firstDetail(deal.details, dealFields) && (
                              <p className="mt-1 truncate text-xs font-medium text-ink-muted">
                                {firstDetail(deal.details, dealFields)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setMenuId((current) => (current === deal.id ? null : deal.id))
                            }
                            disabled={boardBusy}
                            aria-expanded={menuOpen}
                            aria-label={`Mover ${deal.title} para outra etapa`}
                            className={
                              "icon-button grid h-8 w-8 place-items-center rounded-md text-ink-muted/50 hover:bg-brand-50 hover:text-brand-700 " +
                              (menuOpen ? "bg-brand-50 text-brand-700" : "")
                            }
                          >
                            <IconChevronRight
                              className={
                                "h-4 w-4 transition-transform duration-150 " +
                                (menuOpen ? "rotate-90" : "")
                              }
                            />
                          </button>
                          <form action={deleteDeal} className="shrink-0">
                            <input type="hidden" name="id" value={deal.id} />
                            <PendingButton
                              className="icon-button grid h-8 w-8 place-items-center rounded-md text-ink-muted/50 opacity-100 hover:bg-danger-50 hover:text-danger-600 sm:opacity-0 sm:group-hover:opacity-100"
                              title="Excluir venda"
                              aria-label={`Excluir ${deal.title}`}
                              iconOnly
                              pendingLabel="Excluindo"
                            >
                              <IconTrash className="h-4 w-4" />
                            </PendingButton>
                          </form>
                        </div>
                      </div>

                      {menuOpen && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                          {otherStages.map((s) => (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => {
                                commitMove(deal.id, s.key);
                                setMenuId(null);
                              }}
                              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                            >
                          {stages?.[s.key]?.label ?? s.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p
                          className={
                            "text-sm font-black tabular-nums " +
                            (stage.key === "perdido"
                              ? "text-ink-muted line-through"
                              : stage.key === "ganho"
                              ? "text-success-700"
                              : "text-brand-700")
                          }
                        >
                          {formatBRL(deal.value_cents)}
                        </p>
                        {stage.key === "ganho" && (
                          <IconCheck className="h-4 w-4 text-success-700" />
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
