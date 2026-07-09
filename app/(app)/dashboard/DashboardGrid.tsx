"use client";

import { useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { saveDashboardLayout } from "../actions";
import { IconGrip, IconPlus, IconSettings, IconX } from "../icons";
import { WIDGET_CATALOG, type WidgetInstance, type WidgetType } from "@/lib/dashboardWidgets";

type Props = {
  initialLayout: WidgetInstance[];
  nodes: Partial<Record<WidgetType, ReactNode>>;
};

const WIDGET_LABEL: Partial<Record<WidgetType, string>> = Object.fromEntries(
  WIDGET_CATALOG.map((widget) => [widget.type, widget.label])
);

export function DashboardGrid({ initialLayout, nodes }: Props) {
  const [layout, setLayout] = useState<WidgetInstance[]>(() =>
    initialLayout.filter((widget) => nodes[widget.type])
  );
  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ id: string; pointerStartY: number } | null>(null);

  function getItemEl(id: string) {
    return listRef.current?.querySelector<HTMLElement>(`[data-widget-id="${id}"]`) ?? null;
  }

  function saveNow(next: WidgetInstance[]) {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    startTransition(() => {
      saveDashboardLayout(next);
    });
  }

  function scheduleSave(next: WidgetInstance[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNow(next), 600);
  }

  function removeWidget(id: string) {
    setLayout((prev) => {
      const next = prev.filter((widget) => widget.id !== id);
      saveNow(next);
      return next;
    });
  }

  function addWidget(type: WidgetType) {
    setLayout((prev) => {
      if (prev.some((widget) => widget.type === type)) return prev;
      const next = [...prev, { id: type, type }];
      saveNow(next);
      return next;
    });
    setAddOpen(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (!editMode) return;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    drag.current = { id, pointerStartY: event.clientY };
    setDraggingId(id);
    const item = getItemEl(id);
    if (item) item.style.setProperty("--drag-y", "0px");
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state) return;
    const draggedEl = getItemEl(state.id);
    if (!draggedEl) return;

    let deltaY = event.clientY - state.pointerStartY;
    draggedEl.style.setProperty("--drag-y", `${deltaY}px`);

    const index = layout.findIndex((widget) => widget.id === state.id);
    if (index === -1) return;

    if (index < layout.length - 1) {
      const nextEl = getItemEl(layout[index + 1].id);
      if (nextEl) {
        const draggedRect = draggedEl.getBoundingClientRect();
        const nextRect = nextEl.getBoundingClientRect();
        const draggedCenter = draggedRect.top + draggedRect.height / 2;
        const nextCenter = nextRect.top + nextRect.height / 2;
        if (draggedCenter > nextCenter) {
          state.pointerStartY += nextRect.height;
          deltaY = event.clientY - state.pointerStartY;
          draggedEl.style.setProperty("--drag-y", `${deltaY}px`);
          swap(index, index + 1);
          return;
        }
      }
    }

    if (index > 0) {
      const prevEl = getItemEl(layout[index - 1].id);
      if (prevEl) {
        const draggedRect = draggedEl.getBoundingClientRect();
        const prevRect = prevEl.getBoundingClientRect();
        const draggedCenter = draggedRect.top + draggedRect.height / 2;
        const prevCenter = prevRect.top + prevRect.height / 2;
        if (draggedCenter < prevCenter) {
          state.pointerStartY -= prevRect.height;
          deltaY = event.clientY - state.pointerStartY;
          draggedEl.style.setProperty("--drag-y", `${deltaY}px`);
          swap(index, index - 1);
        }
      }
    }
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const item = getItemEl(state.id);
    if (item) item.style.removeProperty("--drag-y");
    drag.current = null;
    setDraggingId(null);
    scheduleSave(layout);
  }

  function swap(i: number, j: number) {
    setLayout((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function toggleEditMode() {
    setEditMode((prev) => {
      const next = !prev;
      if (prev) saveNow(layout);
      return next;
    });
  }

  const availableToAdd = WIDGET_CATALOG.filter(
    (widget) => nodes[widget.type] && !layout.some((item) => item.type === widget.type)
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-ink-soft">Seu painel</h2>
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="nav-item inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-xs font-black text-ink-soft hover:bg-surface-2 hover:text-ink"
            >
              <IconPlus className="h-4 w-4" />
              Adicionar
            </button>
          )}
          <button
            type="button"
            onClick={toggleEditMode}
            className={
              "nav-item inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-black " +
              (editMode
                ? "border-brand-700 bg-brand-700 text-white hover:bg-brand-800"
                : "border-line bg-white text-ink-soft hover:bg-surface-2 hover:text-ink")
            }
          >
            <IconSettings className="h-4 w-4" />
            {editMode ? "Concluir" : "Personalizar"}
          </button>
        </div>
      </div>

      {layout.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-[#f8faff] p-8 text-center">
          <p className="text-sm font-black text-ink">Nenhum widget por aqui.</p>
          <p className="mt-1 text-sm font-medium text-ink-muted">
            Toque em Adicionar para montar seu painel.
          </p>
          {!editMode && (
            <button
              type="button"
              onClick={() => {
                setEditMode(true);
                setAddOpen(true);
              }}
              className="nav-item mt-4 inline-flex h-10 items-center gap-1.5 rounded-md bg-brand-700 px-4 text-sm font-black text-white hover:bg-brand-800"
            >
              <IconPlus className="h-4 w-4" />
              Adicionar widget
            </button>
          )}
        </div>
      ) : (
        <div ref={listRef} className="space-y-4 sm:space-y-5">
          {layout.map((widget) => (
            <div
              key={widget.id}
              data-widget-id={widget.id}
              className={
                "widget-item relative" + (draggingId === widget.id ? " widget-dragging" : "")
              }
            >
              {editMode && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
                  <button
                    type="button"
                    onPointerDown={(event) => handlePointerDown(event, widget.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="widget-grip grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-white hover:text-ink"
                    aria-label={`Arrastar para reordenar ${WIDGET_LABEL[widget.type] ?? ""}`}
                  >
                    <IconGrip className="h-5 w-5" />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-xs font-black text-ink-soft">
                    {WIDGET_LABEL[widget.type]}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeWidget(widget.id)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-white hover:text-danger-600"
                    aria-label={`Remover ${WIDGET_LABEL[widget.type] ?? ""}`}
                  >
                    <IconX className="h-5 w-5" />
                  </button>
                </div>
              )}
              <div className={editMode ? "pointer-events-none" : undefined}>{nodes[widget.type]}</div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setAddOpen(false)}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-x-3 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 max-h-[min(520px,calc(100dvh-8rem))] overflow-y-auto rounded-lg border border-line bg-white p-5 shadow-[0_22px_60px_-28px_rgba(15,23,42,0.65)] sm:inset-x-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-ink">Adicionar widget</h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="nav-item grid h-9 w-9 place-items-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Fechar"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {availableToAdd.length === 0 ? (
              <p className="mt-4 text-sm font-medium text-ink-muted">
                Todos os widgets disponíveis já estão no seu painel.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {availableToAdd.map((widget) => (
                  <li key={widget.type}>
                    <button
                      type="button"
                      onClick={() => addWidget(widget.type)}
                      className="row-link flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 text-left hover:border-brand-400"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-ink">{widget.label}</span>
                        <span className="mt-0.5 block text-xs font-medium text-ink-muted">
                          {widget.description}
                        </span>
                      </span>
                      <IconPlus className="h-4 w-4 shrink-0 text-brand-700" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
