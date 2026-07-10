"use client";

import { useEffect, useMemo, useState, useTransition, type DragEvent, type ReactNode } from "react";
import {
  DASHBOARD_WIDGETS,
  type DashboardPreferences,
  type DashboardWidgetKey,
} from "@/lib/dashboard-preferences";

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
  const [dragging, setDragging] = useState<DashboardWidgetKey | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const sortedItems = [...items].sort(
    (a, b) => widgets.indexOf(a.id) - widgets.indexOf(b.id)
  );

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

  function moveWidget(from: DashboardWidgetKey, to: DashboardWidgetKey) {
    setWidgets((current) => {
      const next = reorder(current, from, to);
      if (next === current) return current;
      persist(next);
      return next;
    });
  }

  function onDragStart(event: DragEvent<HTMLDivElement>, widget: DashboardWidgetKey) {
    if (!editMode) {
      event.preventDefault();
      return;
    }
    if (isInteractive(event.target)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", widget);
    setDragging(widget);
  }

  useEffect(() => {
    function handleEditMode(event: Event) {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      setEditMode(Boolean(customEvent.detail?.enabled));
      if (!customEvent.detail?.enabled) setDragging(null);
    }

    window.addEventListener("dashboard-edit-mode", handleEditMode);
    return () => window.removeEventListener("dashboard-edit-mode", handleEditMode);
  }, []);

  return (
    <section
      className="dashboard-widget-grid grid gap-4 sm:gap-5 xl:grid-cols-12"
      data-editing={editMode ? "true" : undefined}
      data-saving={isSaving ? "true" : undefined}
    >
      {sortedItems.map((item) => (
        <div
          key={item.id}
          data-dashboard-widget={item.id}
          draggable={editMode}
          onDragStart={(event) => onDragStart(event, item.id)}
          onDragOver={(event) => {
            if (!editMode) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={(event) => {
            if (!editMode) return;
            event.preventDefault();
            const from = dragging ?? event.dataTransfer.getData("text/plain");
            if (isDashboardWidget(from) && from !== item.id) moveWidget(from, item.id);
            setDragging(null);
          }}
          onDragEnd={() => setDragging(null)}
          className={`${item.className} dashboard-widget-shell ${
            dragging === item.id ? "dashboard-widget-dragging" : ""
          }`}
        >
          {item.node}
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

function reorder<T extends string>(items: T[], from: T, to: T) {
  const next = [...items];
  const fromIndex = next.indexOf(from);
  const toIndex = next.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, from);
  return next;
}

function isDashboardWidget(value: string): value is DashboardWidgetKey {
  return DASHBOARD_WIDGETS.some((widget) => widget === value);
}

function isInteractive(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest("a, button, input, select, textarea, form, details, summary, [role='button']"))
    : false;
}
