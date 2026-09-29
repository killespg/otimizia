"use client";

import * as React from "react";
import { Bot } from "lucide-react";
import { COMUM, VERTICALS, type Feature } from "./professions-data";

function FeatureRow({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div className="oz-feature">
      <span className="oz-feature-icon">
        <Icon size={16} strokeWidth={2} aria-hidden />
      </span>
      <span style={{ minWidth: 0 }}>
        <b>{feature.title}</b>
        <span>{feature.description}</span>
      </span>
    </div>
  );
}

/**
 * Recursos por profissão. Abas com contrato completo de teclado (setas,
 * Home, End) e tabpanel; o painel inicial é o do corretor, como antes.
 */
export function Professions() {
  const [activeKey, setActiveKey] = React.useState(VERTICALS[2].key);
  const vertical = VERTICALS.find((item) => item.key === activeKey) ?? VERTICALS[2];
  const tabsRef = React.useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? VERTICALS.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + VERTICALS.length) % VERTICALS.length;
    setActiveKey(VERTICALS[next].key);
    tabsRef.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Escolha a profissão" className="oz-tabs">
        {VERTICALS.map((item, index) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`profession-tab-${item.key}`}
            aria-controls="profession-tabpanel"
            aria-label={item.tab}
            aria-selected={item.key === vertical.key}
            tabIndex={item.key === vertical.key ? 0 : -1}
            ref={(node) => {
              tabsRef.current[index] = node;
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => setActiveKey(item.key)}
            className="oz-tab"
          >
            <span className="sm:hidden" aria-hidden>
              {item.mobileTab}
            </span>
            <span className="hidden sm:inline" aria-hidden>
              {item.tab}
            </span>
          </button>
        ))}
      </div>

      <div id="profession-tabpanel" role="tabpanel" aria-labelledby={`profession-tab-${vertical.key}`} tabIndex={0} className="oz-tabpanel">
        <p className="oz-tabpanel-headline">{vertical.headline}</p>

        <div className="oz-card oz-tim-band" style={{ marginTop: 40 }}>
          <p className="oz-eyebrow" style={{ alignSelf: "start" }}>Sócio-assistente</p>
          <div style={{ minWidth: 0 }}>
            <div className="oz-tim-head">
              <span className="oz-tim-badge">
                <Bot size={20} strokeWidth={2} aria-hidden />
              </span>
              <div style={{ minWidth: 0 }}>
                <p className="oz-h3">Tim, o sócio-assistente</p>
                <p className="oz-body" style={{ marginTop: 10, maxWidth: "62ch" }}>
                  {vertical.tim.line}
                </p>
              </div>
            </div>
            <ul className="oz-tim-examples">
              {vertical.tim.examples.map((example) => (
                <li key={example} className="oz-chip">
                  “{example}”
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="oz-rows">
          {vertical.groups.map((group) => (
            <div key={group.label} className="oz-band-row">
              <p className="oz-label" style={{ paddingTop: 16 }}>
                {group.label}
              </p>
              <div className="oz-feature-grid">
                {group.features.map((feature) => (
                  <FeatureRow key={feature.title} feature={feature} />
                ))}
              </div>
            </div>
          ))}
          <div className="oz-band-row">
            <div style={{ paddingTop: 16 }}>
              <p className="oz-label">Em todas</p>
              <p className="oz-small" style={{ marginTop: 6 }}>
                Vale para as três profissões.
              </p>
            </div>
            <div className="oz-feature-grid">
              {COMUM.map((feature) => (
                <FeatureRow key={feature.title} feature={feature} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
