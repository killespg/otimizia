"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Seleção múltipla genérica das listas do painel (imóveis, produtos, casos).
 * Ids que saem da lista — depois de excluir, filtrar ou paginar — são
 * descartados antes de enviar o lote, então a ação nunca leva id fantasma.
 */
export function useBulkSelection(itemIds: string[]) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => selectedIds.filter((id) => itemIds.includes(id)),
    [selectedIds, itemIds]
  );
  const selectedCount = selected.length;
  const allSelected = itemIds.length > 0 && selectedCount === itemIds.length;

  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds([]);
    setError(null);
  }

  function toggleSelectionMode() {
    if (selectionMode) exitSelection();
    else setSelectionMode(true);
  }

  function toggleOne(id: string, isSelected: boolean) {
    setError(null);
    setSelectedIds((current) =>
      isSelected
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((item) => item !== id)
    );
  }

  function toggleAll(isSelected: boolean) {
    setError(null);
    setSelectedIds(isSelected ? itemIds : []);
  }

  function run(action: (ids: string[]) => Promise<unknown>) {
    if (selectedCount === 0 || isPending) return;
    const ids = selected;
    setError(null);
    startTransition(async () => {
      try {
        await action(ids);
        setSelectedIds([]);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não deu para concluir a ação.");
      }
    });
  }

  return {
    isPending,
    selectionMode,
    selected,
    selectedCount,
    allSelected,
    error,
    exitSelection,
    toggleSelectionMode,
    toggleOne,
    toggleAll,
    run,
  };
}

/**
 * Botão que liga o modo de seleção. É só o ícone — ocupa uma célula quadrada no
 * canto do cabeçalho da lista, em vez de uma faixa própria — mas mantém os 44px
 * de alvo de toque e anuncia o estado por `aria-pressed` + `title`.
 */
export function BulkSelectToggle({
  active,
  onToggle,
  label,
  dark = false,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  dark?: boolean;
}) {
  const title = active ? "Cancelar seleção" : label;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={title}
      title={title}
      className={
        "grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] border transition " +
        (dark
          ? active
            ? "border-od-accent/40 bg-od-accent/[0.12] text-white"
            : "border-white/[0.12] text-od-text-2 hover:bg-white/[0.04] hover:text-white"
          : active
            ? "border-brand-700 bg-brand-50 text-brand-700"
            : "border-line bg-surface text-ink-soft hover:bg-surface-2 hover:text-ink")
      }
    >
      {active ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 6 2 2 3-3" />
          <path d="m3 15 2 2 3-3" />
          <path d="M12 7h9M12 16h9" />
        </svg>
      )}
    </button>
  );
}

// A caixa nativa desaparece nas superfícies escuras (quadrado escuro em fundo
// escuro) e some entre a foto e o título nas claras. Aqui ela é desenhada à mão:
// borda sempre visível, marca própria e alvo de toque de 44px em volta dos 18px
// que aparecem.
const BOX_BASE = "grid size-[18px] place-items-center rounded-[5px] border transition";

function boxClass(dark: boolean, active: boolean) {
  if (active) {
    return `${BOX_BASE} ${dark ? "border-od-accent bg-od-accent text-[#1e1d22]" : "border-brand-700 bg-brand-700 text-white"}`;
  }
  return `${BOX_BASE} ${dark ? "border-white/35 bg-white/[0.04] text-transparent group-hover/check:border-white/60" : "border-ink-muted/50 bg-surface text-transparent group-hover/check:border-brand-700"}`;
}

function CheckGlyph({ indeterminate = false }: { indeterminate?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {indeterminate ? <path d="M4 8h8" /> : <path d="m3.5 8.5 3 3 6-6.5" />}
    </svg>
  );
}

export function BulkSelectCheckbox({
  checked,
  onCheckedChange,
  label,
  dark = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  dark?: boolean;
}) {
  return (
    <label className="group/check -mx-2 -my-3 flex shrink-0 cursor-pointer px-2 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span className={boxClass(dark, checked) + " peer-focus-visible:ring-2 peer-focus-visible:ring-brand-700/60"}>
        <CheckGlyph />
      </span>
    </label>
  );
}

/** Caixa de "marcar tudo" para o cabeçalho da lista, com estado intermediário. */
export function BulkSelectAll({
  allSelected,
  someSelected,
  onToggleAll,
  dark = false,
  label = "Selecionar todos",
}: {
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (selected: boolean) => void;
  dark?: boolean;
  label?: string;
}) {
  const active = allSelected || someSelected;
  return (
    <label className="group/check -mx-2 -my-3 flex shrink-0 cursor-pointer px-2 py-3" title={label}>
      <input
        type="checkbox"
        checked={allSelected}
        onChange={(event) => onToggleAll(event.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span className={boxClass(dark, active) + " peer-focus-visible:ring-2 peer-focus-visible:ring-brand-700/60"}>
        <CheckGlyph indeterminate={someSelected && !allSelected} />
      </span>
    </label>
  );
}

/**
 * Faixa de ações em lote: não existe enquanto nada estiver marcado, então a
 * lista fica igual ao que era até o primeiro clique numa caixa. Gruda no rodapé
 * da lista para continuar alcançável em catálogo longo. A exclusão é em dois
 * toques — o primeiro pede confirmação com a contagem, o segundo executa.
 */
export function BulkActionBar({
  allSelected,
  selectedCount,
  isPending,
  error,
  onToggleAll,
  onDelete,
  nounSingular,
  nounPlural,
  dark = false,
  children,
}: {
  allSelected: boolean;
  selectedCount: number;
  isPending: boolean;
  error: string | null;
  onToggleAll: (selected: boolean) => void;
  onDelete: () => void;
  nounSingular: string;
  nounPlural: string;
  dark?: boolean;
  children?: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const disabled = selectedCount === 0 || isPending;
  const noun = selectedCount === 1 ? nounSingular : nounPlural;

  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Ações da seleção"
      className={
        "fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-control)] border px-3 py-1.5 shadow-lg sm:bottom-6 " +
        (dark ? "border-white/[0.12] bg-[#1e1d22]" : "border-line bg-surface")
      }
    >
      <span className={"text-xs font-semibold " + (dark ? "text-white/80" : "text-ink")}>
        {selectedCount} {noun}
      </span>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          onToggleAll(!allSelected);
        }}
        className={"text-xs font-medium underline-offset-2 hover:underline " + (dark ? "text-od-text-3" : "text-ink-muted")}
      >
        {allSelected ? "Limpar" : "Selecionar todos"}
      </button>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {children}
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={
                "min-h-11 px-2 text-xs font-medium " + (dark ? "text-od-text-3 hover:text-white" : "text-ink-muted hover:text-ink")
              }
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
              className="min-h-11 rounded-[var(--radius-control)] bg-danger-700 px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Excluindo..." : `Excluir ${selectedCount} definitivamente`}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setConfirming(true)}
            className={
              "min-h-11 rounded-[var(--radius-control)] border px-3 text-xs font-semibold disabled:opacity-50 " +
              (dark
                ? "border-white/[0.12] text-[#fb7767] hover:bg-white/[0.04]"
                : "border-line bg-surface text-danger-700 hover:bg-danger-50")
            }
          >
            Excluir
          </button>
        )}
      </div>
      {error && (
        <p className={"w-full text-xs font-semibold " + (dark ? "text-[#fb7767]" : "text-danger-700")}>{error}</p>
      )}
    </div>
  );
}
