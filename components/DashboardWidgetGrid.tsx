"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  DASHBOARD_WIDGET_LABELS,
  type DashboardPreferences,
  type DashboardWidgetKey,
} from "@/lib/dashboard-preferences";
import { IconGrip } from "@/app/(app)/icons";

type DashboardWidgetGridProps = {
  preferences: DashboardPreferences;
  action: (formData: FormData) => void | Promise<void>;
  items: {
    id: DashboardWidgetKey;
    className: string;
    node: ReactNode;
  }[];
};

export function DashboardWidgetGrid({
  preferences,
  action,
  items,
}: DashboardWidgetGridProps) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const [widgets, setWidgets] = useState(() => normalizeWidgets(preferences.widgets, itemIds));
  const [draggingId, setDraggingId] = useState<DashboardWidgetKey | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const listRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: DashboardWidgetKey; pointerStartY: number } | null>(null);

  const sortedItems = [...items].sort(
    (a, b) => widgets.indexOf(a.id) - widgets.indexOf(b.id)
  );

  useEffect(() => {
    function handleEditMode(event: Event) {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      setEditMode(Boolean(customEvent.detail?.enabled));
      if (!customEvent.detail?.enabled) setDraggingId(null);
    }

    window.addEventListener("dashboard-edit-mode", handleEditMode);
    return () => window.removeEventListener("dashboard-edit-mode", handleEditMode);
  }, []);

  function getItemEl(id: DashboardWidgetKey) {
    return listRef.current?.querySelector<HTMLElement>(`[data-dashboard-widget="${id}"]`) ?? null;
  }

  function persist(nextWidgets: DashboardWidgetKey[]) {
    const formData = new FormData();
    formData.set("dashboard_style", preferences.style);
    formData.set("dashboard_accent", preferences.accent);
    preferences.metrics.forEach((metric) => formData.append("dashboard_metrics", metric));
    Object.entries(preferences.metricLabels).forEach(([key, label]) => {
      if (label) formData.set(`metric_label_${key}`, label);
    });
    nextWidgets.forEach((widget) => formData.append("dashboard_widgets", widget));

    startSaving(() => {
      void action(formData);
    });
  }

  function swap(i: number, j: number) {
    setWidgets((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  // Arraste por pointer events (não HTML5 drag-and-drop) porque HTML5 DnD
  // não funciona em telas de toque — e este é um app mobile-first (inclui o
  // wrapper Android via Capacitor).
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, id: DashboardWidgetKey) {
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

    const index = widgets.indexOf(state.id);
    if (index === -1) return;

    if (index < widgets.length - 1) {
      const nextEl = getItemEl(widgets[index + 1]);
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
      const prevEl = getItemEl(widgets[index - 1]);
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
    persist(widgets);
  }

  return (
    <section
      ref={listRef}
      className="dashboard-widget-grid grid gap-4 sm:gap-5 xl:grid-cols-12"
      data-editing={editMode ? "true" : undefined}
      data-saving={isSaving ? "true" : undefined}
    >
      {sortedItems.map((item) => (
        <div
          key={item.id}
          data-dashboard-widget={item.id}
          className={`${item.className} widget-item dashboard-widget-shell ${
            draggingId === item.id ? "widget-dragging dashboard-widget-dragging" : ""
          }`}
        >
          {editMode && (
            <div className="dashboard-widget-drag-bar">
              <button
                type="button"
                onPointerDown={(event) => handlePointerDown(event, item.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="dashboard-widget-grip"
                aria-label={`Arrastar para reordenar ${DASHBOARD_WIDGET_LABELS[item.id]}`}
              >
                <IconGrip className="h-4 w-4" />
              </button>
              <span className="dashboard-widget-drag-label">{DASHBOARD_WIDGET_LABELS[item.id]}</span>
            </div>
          )}
          <div className={editMode ? "pointer-events-none" : undefined}>{item.node}</div>
        </div>
      ))}
    </section>
  );
}

function normalizeWidgets(
  value: DashboardWidgetKey[],
  available: DashboardWidgetKey[]
): DashboardWidgetKey[] {
  const ordered = value.filter((widget) => available.includes(widget));
  const missing = available.filter((widget) => !ordered.includes(widget));
  return [...ordered, ...missing];
}
