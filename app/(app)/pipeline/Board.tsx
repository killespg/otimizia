"use client";

import { useState, useTransition } from "react";
import { DEAL_STAGES, type Deal, type DealStage } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/format";
import { moveDeal, deleteDeal } from "../actions";

export default function Board({
  initialDeals,
  contactNames,
}: {
  initialDeals: Deal[];
  contactNames: Record<string, string>;
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDrop(stage: DealStage) {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, stage } : d))
    );
    startTransition(() => {
      moveDeal(id, stage);
    });
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-5">
      {DEAL_STAGES.map((col) => {
        const colDeals = deals.filter((d) => d.stage === col.key);
        const total = colDeals.reduce((s, d) => s + d.value_cents, 0);
        return (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.key)}
            className="flex flex-col rounded-xl border border-gray-200 bg-gray-100/60 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs text-gray-500">{colDeals.length}</span>
            </div>
            <p className="mb-2 text-xs text-gray-500">{formatBRL(total)}</p>
            <div className="flex flex-1 flex-col gap-2">
              {colDeals.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={() => setDragId(d.id)}
                  className="group cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{d.title}</p>
                    <form action={deleteDeal}>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        className="text-xs text-gray-300 hover:text-red-500"
                        title="Excluir"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                  {d.contact_id && contactNames[d.contact_id] && (
                    <p className="mt-1 text-xs text-gray-500">
                      {contactNames[d.contact_id]}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-semibold text-brand-700">
                    {formatBRL(d.value_cents)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
