"use client";

import Link from "next/link";
import { useState } from "react";
import { DATAJUD_TRIBUNALS } from "@/lib/datajud-tribunals";

type WatchedProcess = {
  id: string;
  tribunal_alias: string;
  case_number: string;
  case_id: string | null;
  label: string | null;
  last_movement_nome: string | null;
  last_movement_at: string | null;
};

function formatNumero(numero: string) {
  const digits = numero.replace(/\D/g, "");
  if (digits.length !== 20) return numero;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `Há ${days} dias`;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

export function RecentProcessChanges({ initialItems }: { initialItems: WatchedProcess[] }) {
  const [items, setItems] = useState(initialItems);
  const [dismissing, setDismissing] = useState<string | null>(null);

  async function markSeen(id: string) {
    if (dismissing) return;
    setDismissing(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch("/api/law/watched-processes/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } finally {
      setDismissing(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-base font-black text-ink">Mudanças recentes</h2>
        <span className="tag bg-brand-50 text-brand-700">{items.length}</span>
      </div>
      <div className="divide-y divide-line">
        {items.map((item) => {
          const tribunalLabel = DATAJUD_TRIBUNALS.find((t) => t.alias === item.tribunal_alias)?.label ?? item.tribunal_alias;
          return (
            <article key={item.id} className="flex items-start justify-between gap-3 px-5 py-4">
              <Link href={item.case_id ? `/painel/juridico/processos/${item.case_id}` : "/painel/juridico/consulta"} className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-ink">{item.label ?? formatNumero(item.case_number)}</p>
                <p className="mt-1 truncate text-xs font-bold text-ink-muted">{tribunalLabel} · {formatNumero(item.case_number)}</p>
                <p className="mt-1 truncate text-xs font-semibold text-brand-700">{item.last_movement_nome}</p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-xs font-bold text-ink-muted">
                  {item.last_movement_at ? relativeDate(item.last_movement_at) : ""}
                </span>
                <button
                  type="button"
                  onClick={() => markSeen(item.id)}
                  disabled={dismissing === item.id}
                  className="rounded-md bg-surface-2 px-2 py-1 text-xs font-black text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                >
                  Marcar como visto
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

