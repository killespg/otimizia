"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/supabase/types";
import { BulkActionBar, BulkSelectToggle } from "@/components/ui/BulkSelect";
import TaskItem from "./TaskItem";
import { useTaskSelection } from "./useTaskSelection";

export type Tone = "danger" | "today" | "upcoming" | "done";

type Member = { user_id: string; name: string | null };

const TONE_CLASS: Record<Tone, string> = {
  danger: "bg-danger-50 text-danger-700 dark:bg-[#3a0b08] dark:text-[#ffb4ac]",
  today: "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200",
  upcoming: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
  done: "bg-success-50 text-success-700 dark:bg-[#062d1c] dark:text-[#9ff0c5]",
};

export default function TaskGroup({
  title,
  items,
  overdue,
  tone,
  empty,
  members,
  currentUserId,
  isAdmin,
  canReviewAll,
  isSeller,
}: {
  title: string;
  items: Task[];
  overdue: boolean;
  tone: Tone;
  empty: string;
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  canReviewAll: boolean;
  isSeller: boolean;
}) {
  const itemIds = useMemo(() => items.map((task) => task.id), [items]);
  const selection = useTaskSelection(itemIds);

  return (
    <section
      className={
        isSeller
          ? "overflow-hidden border-b border-white/[0.08] xl:border-r xl:even:border-r-0 xl:[&:nth-last-child(-n+2)]:border-b-0"
          : "panel overflow-hidden"
      }
    >
      <div
        className={
          isSeller
            ? "flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4"
            : "flex items-center justify-between gap-3 border-b border-line px-5 py-4"
        }
      >
        <div>
          <h2
            className={
              isSeller
                ? "text-sm font-semibold text-white"
                : "text-base font-black tracking-[-0.02em] text-ink sm:text-lg"
            }
          >
            {title}
          </h2>
          <p className={isSeller ? "mt-1 text-xs text-od-text-3" : "mt-1 text-sm font-medium text-ink-muted"}>
            {items.length === 0
              ? empty
              : `${items.length} ${items.length === 1 ? "item" : "itens"} nesta fila.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {items.length > 0 && (
            <BulkSelectToggle
              active={selection.selectionMode}
              onToggle={selection.toggleSelectionMode}
              label="Selecionar lembretes"
              dark={isSeller}
            />
          )}
          <span className={`rounded-md px-2.5 py-1 text-xs font-black ${TONE_CLASS[tone]}`}>
            {String(items.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {selection.selectionMode && items.length > 0 && (
        <BulkActionBar
          allSelected={selection.allSelected}
          selectedCount={selection.selectedCount}
          isPending={selection.isPending}
          error={selection.feedback}
          onToggleAll={selection.toggleAll}
          onDelete={() => selection.runBulk("delete")}
          nounSingular="lembrete"
          nounPlural="lembretes"
          dark={isSeller}
        >
          <button
            type="button"
            disabled={selection.isPending}
            onClick={() => selection.runBulk(tone === "done" ? "undone" : "done")}
            className={
              "min-h-11 rounded-[var(--radius-control)] px-3 text-xs font-semibold disabled:opacity-50 " +
              (isSeller ? "bg-od-accent text-[#1e1d22]" : "bg-brand-700 text-white hover:bg-brand-800")
            }
          >
            {tone === "done" ? "Reabrir" : "Concluir"}
          </button>
        </BulkActionBar>
      )}

      {items.length === 0 ? (
        <div className={isSeller ? "flex min-h-20 items-center px-5 py-4" : "px-5 py-6"}>
          <div
            className={
              isSeller
                ? "text-left"
                : "rounded-lg border border-dashed border-line bg-[#f8fbff] p-5 text-center"
            }
          >
            <div>
              <p className={isSeller ? "text-sm font-semibold text-white/68" : "text-sm font-black text-ink"}>
                Fila vazia
              </p>
              <p className={isSeller ? "mt-1 text-xs text-od-text-3" : "mt-1 text-sm font-medium text-ink-muted"}>
                {empty}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line px-5">
          {items.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              overdue={overdue}
              members={members}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              canReviewAll={canReviewAll}
              selectable={selection.selectionMode}
              selected={selection.selected.includes(task.id)}
              onSelectedChange={(isSelected) => selection.toggleOne(task.id, isSelected)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
