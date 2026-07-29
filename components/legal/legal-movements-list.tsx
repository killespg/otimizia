"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, FileSearch, RefreshCw } from "lucide-react";
import { DATAJUD_TRIBUNALS } from "@/lib/datajud-tribunals";
import type { LegalWatchedProcess } from "@/lib/supabase/types";

function processNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 20) return value;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

function dateTime(value: string | null) {
  if (!value) return "Ainda sem movimentação";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function isUnread(item: LegalWatchedProcess) {
  return Boolean(item.last_movement_at && (!item.seen_at || new Date(item.last_movement_at) > new Date(item.seen_at)));
}

export function LegalMovementsList({ initialItems }: { initialItems: LegalWatchedProcess[] }) {
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<"review" | "all">("review");
  const [saving, setSaving] = useState<string | null>(null);
  const visible = useMemo(() => view === "all" ? items : items.filter(isUnread), [items, view]);

  async function markSeen(id: string) {
    setSaving(id);
    const response = await fetch("/api/law/watched-processes/mark-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      const seenAt = new Date().toISOString();
      setItems((current) => current.map((item) => item.id === id ? { ...item, seen_at: seenAt } : item));
    }
    setSaving(null);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-od-border bg-od-surface">
      <div className="flex flex-col gap-3 border-b border-od-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-od-text">Movimentações monitoradas</h2>
          <p className="mt-1 text-xs text-od-text-2">Atualizações capturadas dos processos acompanhados no DataJud.</p>
        </div>
        <div className="flex rounded-md border border-od-border bg-od-muted-surface p-0.5">
          <button type="button" onClick={() => setView("review")} className={`min-h-8 rounded px-3 text-xs font-semibold ${view === "review" ? "bg-od-accent-tint text-od-text" : "text-od-text-2 hover:text-od-text"}`}>Para revisar</button>
          <button type="button" onClick={() => setView("all")} className={`min-h-8 rounded px-3 text-xs font-semibold ${view === "all" ? "bg-od-accent-tint text-od-text" : "text-od-text-2 hover:text-od-text"}`}>Todos</button>
        </div>
      </div>

      {visible.length ? (
        <div className="divide-y divide-od-border">
          {visible.map((item) => {
            const unread = isUnread(item);
            const tribunal = DATAJUD_TRIBUNALS.find((entry) => entry.alias === item.tribunal_alias)?.label ?? item.tribunal_alias;
            return (
              <article key={item.id} className="grid gap-4 px-5 py-4 transition-colors hover:bg-white/[0.025] md:grid-cols-[minmax(0,1.3fr)_minmax(180px,.8fr)_auto] md:items-center">
                <Link href={item.case_id ? `/painel/juridico/processos/${item.case_id}` : "/painel/juridico/consulta"} className="group min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${unread ? "bg-white/[0.06] text-od-text-2" : "bg-white/[0.05] text-white/40"}`}>
                      {unread ? <RefreshCw size={14} /> : <Check size={14} />}
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-[13px] font-semibold text-od-text group-hover:text-od-text">{item.label || processNumber(item.case_number)}</strong>
                      <span className="mt-1 block truncate text-xs text-od-text-3">{tribunal} · {processNumber(item.case_number)}</span>
                    </span>
                  </div>
                </Link>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-od-text-2">{item.last_movement_nome || "Aguardando primeira sincronização"}</p>
                  <p className="mt-1 text-[11px] text-od-text-3">{dateTime(item.last_movement_at)}</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {unread ? (
                    <button type="button" disabled={saving === item.id} onClick={() => markSeen(item.id)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-od-border px-3 text-[11px] font-semibold text-od-text-2 hover:border-od-border-hover hover:bg-white/[0.03] disabled:opacity-50">
                      <Check size={13} /> {saving === item.id ? "Salvando" : "Marcar como revisada"}
                    </button>
                  ) : <span className="text-[11px] font-medium text-od-text-3">Revisada</span>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <FileSearch className="mx-auto size-7 text-od-text-2" />
          <p className="mt-3 text-sm font-semibold text-od-text">{view === "review" ? "Nenhuma movimentação para revisar" : "Nenhum processo monitorado"}</p>
          <p className="mt-1 text-xs text-od-text-2">{view === "review" ? "Tudo está em dia nesta carteira." : "Consulte um processo no DataJud para começar o acompanhamento."}</p>
        </div>
      )}
    </section>
  );
}
