"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkDeleteTasks, bulkToggleTasks } from "../actions";

export type BulkTaskAction = "done" | "undone" | "delete";

/**
 * Estado de seleção múltipla de lembretes, compartilhado pelas filas da tela de
 * tarefas e pela agenda do mês no calendário. Ids que saem da lista (depois de
 * concluir, excluir ou trocar de mês) são ignorados na hora de enviar o lote.
 */
export function useTaskSelection(itemIds: string[]) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selected = useMemo(
    () => selectedIds.filter((id) => itemIds.includes(id)),
    [selectedIds, itemIds]
  );
  const selectedCount = selected.length;
  const allSelected = itemIds.length > 0 && selectedCount === itemIds.length;

  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds([]);
    setFeedback(null);
  }

  function toggleSelectionMode() {
    if (selectionMode) exitSelection();
    else setSelectionMode(true);
  }

  function toggleOne(id: string, isSelected: boolean) {
    setFeedback(null);
    setSelectedIds((current) =>
      isSelected
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((item) => item !== id)
    );
  }

  function toggleAll(isSelected: boolean) {
    setFeedback(null);
    setSelectedIds(isSelected ? itemIds : []);
  }

  function runBulk(action: BulkTaskAction) {
    if (selectedCount === 0 || isPending) return;
    const ids = selected;
    setFeedback(null);
    startTransition(async () => {
      try {
        if (action === "delete") {
          await bulkDeleteTasks(ids);
        } else {
          const result = await bulkToggleTasks(ids, action === "done");
          if (result.skipped > 0) {
            setFeedback(
              `${result.skipped} ${result.skipped === 1 ? "tarefa precisa" : "tarefas precisam"} de aprovação e não ${result.skipped === 1 ? "foi concluída" : "foram concluídas"}.`
            );
          }
        }
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Não deu para concluir a ação.");
      }
    });
  }

  return {
    isPending,
    selectionMode,
    selected,
    selectedCount,
    allSelected,
    feedback,
    toggleSelectionMode,
    toggleOne,
    toggleAll,
    runBulk,
  };
}
