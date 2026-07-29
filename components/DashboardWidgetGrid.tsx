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
import { IconGrip } from "@/app/(dashboard)/painel/icons";

type DashboardWidgetGridProps = {
  preferences: DashboardPreferences;
  action: (formData: FormData) => void | Promise<void>;
  layout?: "grid" | "stack" | "balanced";
  items: {
    id: DashboardWidgetKey;
    className: string;
    node: ReactNode;
  }[];
};

export function DashboardWidgetGrid({
  preferences,
  action,
  layout = "grid",
  items,
}: DashboardWidgetGridProps) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const [widgets, setWidgets] = useState(() => normalizeWidgets(preferences.widgets, itemIds));
  const [draggingId, setDraggingId] = useState<DashboardWidgetKey | null>(null);
  const [dropTargetId, setDropTargetId] = useState<DashboardWidgetKey | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const listRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{
    id: DashboardWidgetKey;
    pointerStartX: number;
    pointerStartY: number;
    targetId: DashboardWidgetKey | null;
  } | null>(null);
  const widgetsRef = useRef(widgets);

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
    formData.set(
      "dashboard_animated_background",
      preferences.showAnimatedBackground ? "1" : "0",
    );
    preferences.metrics.forEach((metric) => formData.append("dashboard_metrics", metric));
    Object.entries(preferences.metricLabels).forEach(([key, label]) => {
      if (label) formData.set(`metric_label_${key}`, label);
    });
    nextWidgets.forEach((widget) => formData.append("dashboard_widgets", widget));

    startSaving(() => {
      void action(formData);
    });
  }

  function saveWidgets(next: DashboardWidgetKey[]) {
    widgetsRef.current = next;
    setWidgets(next);
    persist(next);
  }

  function moveWidget(id: DashboardWidgetKey, delta: number) {
    const current = widgetsRef.current;
    const fromIndex = current.indexOf(id);
    const toIndex = fromIndex + delta;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= current.length) return;
    const next = [...current];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, id);
    saveWidgets(next);
  }

  // Arraste por pointer events (não HTML5 drag-and-drop) porque HTML5 DnD
  // não funciona em telas de toque — e este é um app mobile-first (inclui o
  // wrapper Android via Capacitor).
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, id: DashboardWidgetKey) {
    if (!editMode) return;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    drag.current = {
      id,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      targetId: null,
    };
    setDraggingId(id);
    const item = getItemEl(id);
    if (item) {
      item.style.setProperty("--drag-x", "0px");
      item.style.setProperty("--drag-y", "0px");
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state) return;
    const draggedEl = getItemEl(state.id);
    if (!draggedEl) return;

    const deltaX = event.clientX - state.pointerStartX;
    const deltaY = event.clientY - state.pointerStartY;
    draggedEl.style.setProperty("--drag-x", `${deltaX}px`);
    draggedEl.style.setProperty("--drag-y", `${deltaY}px`);

    const targetId = widgetsRef.current.find((id) => {
      if (id === state.id) return false;
      const target = getItemEl(id);
      if (!target) return false;
      const rect = target.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    }) ?? null;

    if (targetId !== state.targetId) {
      state.targetId = targetId;
      setDropTargetId(targetId);
    }
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const item = getItemEl(state.id);
    if (item) {
      item.style.removeProperty("--drag-x");
      item.style.removeProperty("--drag-y");
    }
    drag.current = null;
    setDraggingId(null);
    setDropTargetId(null);

    if (!state.targetId) return;
    const current = widgetsRef.current;
    const fromIndex = current.indexOf(state.id);
    const targetIndex = current.indexOf(state.targetId);
    if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return;
    const next = [...current];
    next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, state.id);
    saveWidgets(next);
  }

  return (
    <section
      ref={listRef}
      className={
        layout === "stack"
          ? "dashboard-widget-grid flex flex-col gap-4 sm:gap-6"
          : layout === "balanced"
            ? "dashboard-widget-grid grid items-stretch gap-4 sm:gap-6 xl:grid-flow-row-dense xl:grid-cols-12"
            : "dashboard-widget-grid grid items-start gap-4 sm:gap-6 xl:grid-cols-12"
      }
      data-layout={layout}
      data-editing={editMode ? "true" : undefined}
      data-saving={isSaving ? "true" : undefined}
    >
      {sortedItems.map((item) => (
        <div
          key={item.id}
          data-dashboard-widget={item.id}
          data-drop-target={dropTargetId === item.id ? "true" : undefined}
          className={`${item.className} ${layout === "stack" ? "w-full" : layout === "balanced" ? "self-stretch" : "self-start"} widget-item dashboard-widget-shell ${
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
              <div className="dashboard-widget-order-actions" aria-label={`Alterar posição de ${DASHBOARD_WIDGET_LABELS[item.id]}`}>
                <button type="button" onClick={() => moveWidget(item.id, -1)} disabled={widgets[0] === item.id}>Subir</button>
                <button type="button" onClick={() => moveWidget(item.id, 1)} disabled={widgets[widgets.length - 1] === item.id}>Descer</button>
              </div>
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
