"use client";

import { useState } from "react";
import Link from "next/link";

export type PropertyListRow = {
  id: string;
  title: string;
  statusLabel: string;
  statusTagClass: string;
  subtitle: string;
  facts: string;
  priceLabel: string;
  coverUrl?: string;
};

export function PropertySelectableList({ rows, selectable = true }: { rows: PropertyListRow[]; selectable?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-5 py-4 hover:bg-brand-50">
            {selectable && (
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
                aria-label={`Selecionar ${row.title}`}
                className="h-4 w-4 shrink-0"
              />
            )}
            <Link
              href={`/imoveis/${row.id}`}
              className="nav-item flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {row.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnail vem de storage público
                  <img src={row.coverUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-line object-cover" />
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-ink-muted/60">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
                      <rect x="5" y="3.5" width="10" height="17" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M15 9.5h4.5v11H15" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-ink">{row.title}</p>
                    <span className={"tag " + row.statusTagClass}>{row.statusLabel}</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-bold text-ink-muted">{row.subtitle}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4 sm:justify-end">
                <span className="text-xs font-bold text-ink-muted">{row.facts}</span>
                <span className="text-sm font-black text-ink">{row.priceLabel}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
      {selectable && selected.size > 0 && (
        <div className="sticky bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur-xl sm:bottom-0">
          <span className="text-xs font-bold text-ink-muted">{selected.size} imóvel(is) selecionado(s)</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-bold text-ink-muted hover:text-ink">
              Limpar
            </button>
            <Link href={`/imoveis/colecoes/nova?ids=${Array.from(selected).join(",")}`} className="btn-soft shrink-0 text-xs">
              Criar vitrine com selecionados
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
