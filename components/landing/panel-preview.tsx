"use client";

import * as React from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { PROFESSIONS } from "./panel-data";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/**
 * Demonstração do painel por profissão. Quem explora troca o negócio pelo
 * seletor no topo (as três profissões liberadas no cadastro). Os números são
 * fictícios e vêm de panel-data.ts.
 */
export function PanelPreview() {
  const [index, setIndex] = React.useState(0);
  const p = PROFESSIONS[index];
  const max = Math.max(...p.chartDays);

  return (
    <div className="oz-stage">
      <div className="oz-card oz-window">
        <div className="oz-window-bar">
          <i />
          <i />
          <i />
          <span>{p.org}</span>
        </div>
        <div className="oz-panel">
          <aside className="oz-side" aria-label="Navegação de exemplo">
            <div className="oz-side-org">
              <b>{p.org}</b>
              <span>{p.role}</span>
            </div>
            {p.groups.map((group) => (
              <div key={group.label} className="oz-side-group">
                <p>{group.label}</p>
                {group.items.map((item) => (
                  <div key={item.label} className="oz-side-item">
                    <span>{item.label}</span>
                    {item.badge ? <span className={item.danger ? "oz-badge oz-badge-danger" : "oz-badge"}>{item.badge}</span> : null}
                  </div>
                ))}
              </div>
            ))}
          </aside>

          <div className="oz-main">
            <div role="tablist" aria-label="Profissão do exemplo" className="oz-tabs" style={{ marginBottom: 24, maxWidth: 520, marginInline: 0 }}>
              {PROFESSIONS.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  className="oz-tab"
                  onClick={() => setIndex(i)}
                >
                  {item.role.split(" ")[0]}
                </button>
              ))}
            </div>

            <div className="oz-main-head">
              <div style={{ minWidth: 0 }}>
                <p className="oz-small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CalendarDays size={13} aria-hidden /> {p.dateLabel}
                </p>
                <h3>{p.greeting}</h3>
                <p>
                  {p.summaryPrefix} <strong className="oz-warn">{p.summaryAlert}</strong> e <strong>{p.summaryCount}</strong>{" "}
                  {p.summarySuffix}
                </p>
              </div>
              <div className="oz-fake-btns" aria-hidden="true">
                <span>{p.secondaryAction}</span>
                <span>{p.primaryAction}</span>
              </div>
            </div>

            <div className="oz-tim-line">
              <Sparkles size={14} aria-hidden />
              <span>{p.timPrompt}</span>
            </div>

            <p className="oz-small" style={{ marginBottom: 10 }}>
              Área de trabalho · <span style={{ color: "#fff", fontWeight: 600 }}>{p.workspaceLabel}</span>
            </p>
            <div className="oz-metrics">
              {p.metrics.map(({ icon: Icon, label, value, note }) => (
                <div key={label} className="oz-metric">
                  <div className="oz-metric-top">
                    <Icon size={14} aria-hidden />
                    <span>{label}</span>
                  </div>
                  <b>{value}</b>
                  <small>{note}</small>
                </div>
              ))}
            </div>

            <div className="oz-split">
              <div>
                <p className="oz-small">{p.chartLabel}</p>
                <div className="oz-bars" aria-hidden="true">
                  {p.chartDays.map((h, i) => (
                    <i key={i} className={h === max ? "is-top" : undefined} style={{ height: `${Math.round((h / max) * 100)}%` }} />
                  ))}
                </div>
                <div className="oz-days" aria-hidden="true">
                  {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="oz-small">{p.queueLabel}</p>
                <ul className="oz-queue" style={{ marginTop: 8 }}>
                  {p.queue.map((item) => (
                    <li key={item.name}>
                      <span className="oz-avatar">{initials(item.name)}</span>
                      <span style={{ minWidth: 0 }}>
                        <b>{item.name}</b>
                        <small>{item.note}</small>
                      </span>
                      <span className={item.urgent ? "oz-tag oz-tag-hot" : "oz-tag"}>{item.urgent ? "Hoje" : "Aberto"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
