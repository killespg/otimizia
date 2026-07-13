"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

const LEFT = 8;
const RIGHT = 812;
const TOP = 12;
const BOTTOM = 180;
const VIEW_WIDTH = 820;
const VIEW_HEIGHT = 210;
const GAP = 3;

type Point = { date: string; count: number };

export function SignupsBarChart({ series }: { series: Point[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const n = series.length;
  const maxCount = Math.max(1, ...series.map((point) => point.count));
  const slot = n > 0 ? (RIGHT - LEFT) / n : 0;
  const barWidth = Math.max(2, slot - GAP);

  const barX = (index: number) => LEFT + index * slot + GAP / 2;
  const barHeight = (count: number) => (count / maxCount) * (BOTTOM - TOP);
  const barY = (count: number) => BOTTOM - barHeight(count);

  const isHovering = hoverIndex !== null;
  const displayIndex = hoverIndex ?? Math.max(0, n - 1);
  const displayed = n > 0 ? series[displayIndex] : null;
  const hoverXPercent = displayed
    ? ((barX(displayIndex) + barWidth / 2) / VIEW_WIDTH) * 100
    : null;
  const dayTickEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <div className="relative mt-4 h-[190px] overflow-hidden rounded-lg bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] sm:h-[220px]">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Novos cadastros por dia, últimos 30 dias"
      >
        <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} stroke="#dbe2ef" strokeWidth="1" />

        {series.map((point, index) => (
          <rect
            key={point.date}
            className="chart-bar transition-colors duration-150 ease-out"
            style={{ "--i": index } as React.CSSProperties}
            x={barX(index)}
            y={barY(point.count)}
            width={barWidth}
            height={Math.max(0, barHeight(point.count))}
            rx="2"
            fill={index === hoverIndex ? "#6d28d9" : "#a78bfa"}
            onPointerEnter={() => setHoverIndex(index)}
            onPointerLeave={() => setHoverIndex((current) => (current === index ? null : current))}
          />
        ))}

        <g className="hidden sm:block">
          {series
            .filter((_, index) => index === 0 || index === n - 1 || index % dayTickEvery === 0)
            .map((point) => {
              const index = series.indexOf(point);
              return (
                <text
                  key={point.date}
                  x={barX(index) + barWidth / 2}
                  y={BOTTOM + 18}
                  textAnchor="middle"
                  fill="#60708f"
                  fontSize="11"
                  fontWeight="700"
                >
                  {formatDate(point.date).slice(0, 5)}
                </text>
              );
            })}
        </g>
      </svg>

      {displayed && hoverXPercent !== null && (
        <div
          className={
            "pointer-events-none absolute top-2 -translate-x-1/2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-ink shadow-[0_10px_28px_-16px_rgba(15,23,42,0.55)] transition-[left,opacity,transform] duration-100 ease-out " +
            (isHovering ? "opacity-100 scale-100" : "scale-95 opacity-0")
          }
          style={{ left: `${Math.min(92, Math.max(8, hoverXPercent))}%` }}
        >
          <p className="text-ink-muted">{formatDate(displayed.date)}</p>
          <p>{displayed.count} {displayed.count === 1 ? "cadastro" : "cadastros"}</p>
        </div>
      )}

      {n === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-ink-muted">
          Ainda sem cadastros no período.
        </p>
      )}
    </div>
  );
}
