"use client";

import { useId, useState } from "react";
import { formatBRL } from "@/lib/format";

const LEFT = 64;
const RIGHT = 790;
const TOP = 40;
const BOTTOM = 250;
const VIEW_WIDTH = 820;
const VIEW_HEIGHT = 300;

type Point = { day: number; cumulativeCents: number };

export function RevenueLineChart({ series }: { series: Point[] }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const lastValue = series.length > 0 ? series[series.length - 1].cumulativeCents : 0;
  const niceMax = niceCeil(lastValue / 100);
  const niceMaxCents = niceMax * 100;

  const n = series.length;
  const x = (index: number) => (n <= 1 ? LEFT : LEFT + (index / (n - 1)) * (RIGHT - LEFT));
  const y = (cents: number) =>
    niceMaxCents === 0 ? BOTTOM : BOTTOM - (cents / niceMaxCents) * (BOTTOM - TOP);

  const linePoints = series.map((point, index) => `${x(index)},${y(point.cumulativeCents)}`);
  const linePath = linePoints.length > 0 ? `M${linePoints.join(" L")}` : "";
  const areaPath =
    linePoints.length > 0
      ? `M${LEFT},${BOTTOM} L${linePoints.join(" L")} L${x(n - 1)},${BOTTOM} Z`
      : "";

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const dayTickEvery = Math.max(1, Math.ceil(n / 6));

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (n === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const svgX = ratio * VIEW_WIDTH;
    const clamped = Math.min(RIGHT, Math.max(LEFT, svgX));
    const index = n <= 1 ? 0 : Math.round(((clamped - LEFT) / (RIGHT - LEFT)) * (n - 1));
    setHoverIndex(index);
  }

  const isHovering = hoverIndex !== null && n > 0;
  const displayIndex = hoverIndex ?? Math.max(0, n - 1);
  const displayed = n > 0 ? series[displayIndex] : null;
  const hoverXPercent = displayed ? (x(displayIndex) / VIEW_WIDTH) * 100 : null;

  return (
    <div
      className="relative mt-4 h-[190px] overflow-hidden rounded-lg bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] sm:mt-5 sm:h-[280px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Evolução do valor recebido ao longo do período"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7b3ff2" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#7b3ff2" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridSteps.map((step) => {
          const lineY = BOTTOM - step * (BOTTOM - TOP);
          return (
            <line
              key={step}
              x1={LEFT}
              x2={RIGHT}
              y1={lineY}
              y2={lineY}
              stroke="#dbe2ef"
              strokeWidth="1"
            />
          );
        })}
        <g className="hidden sm:block">
          {gridSteps.map((step) => (
            <text
              key={step}
              x={LEFT - 8}
              y={BOTTOM - step * (BOTTOM - TOP) + 4}
              textAnchor="end"
              fill="#60708f"
              fontSize="13"
              fontWeight="700"
            >
              {formatCompactBRL(niceMax * step)}
            </text>
          ))}
        </g>

        {areaPath && (
          <path className="preview-chart-area" d={areaPath} fill={`url(#${gradientId})`} />
        )}
        {linePath && (
          <path
            className="preview-chart-line"
            pathLength={1}
            d={linePath}
            fill="none"
            stroke="#6d28d9"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        )}
        {n > 0 && (
          <circle
            cx={x(n - 1)}
            cy={y(series[n - 1].cumulativeCents)}
            r="4"
            fill="#6d28d9"
            stroke="#fff"
            strokeWidth="2"
          />
        )}

        <g className="hidden sm:block">
          {series
            .filter((_, index) => index === 0 || index === n - 1 || index % dayTickEvery === 0)
            .map((point) => (
              <text
                key={point.day}
                x={x(point.day - 1)}
                y={BOTTOM + 22}
                textAnchor="middle"
                fill="#60708f"
                fontSize="13"
                fontWeight="700"
              >
                {String(point.day).padStart(2, "0")}
              </text>
            ))}
        </g>

        {displayed && (
          <line
            className="transition-[x1,x2,opacity] duration-100 ease-out"
            x1={x(displayIndex)}
            x2={x(displayIndex)}
            y1={TOP}
            y2={BOTTOM}
            stroke="#7b3ff2"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={isHovering ? 1 : 0}
          />
        )}
        {displayed && (
          <circle
            className="transition-[cx,cy,opacity] duration-100 ease-out"
            cx={x(displayIndex)}
            cy={y(displayed.cumulativeCents)}
            r="5"
            fill="#6d28d9"
            stroke="#fff"
            strokeWidth="2"
            opacity={isHovering ? 1 : 0}
          />
        )}
      </svg>

      {displayed && hoverXPercent !== null && (
        <div
          className={
            "pointer-events-none absolute top-2 -translate-x-1/2 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-ink shadow-[0_10px_28px_-16px_rgba(15,23,42,0.55)] transition-[left,opacity,transform] duration-100 ease-out " +
            (isHovering ? "opacity-100 scale-100" : "pointer-events-none scale-95 opacity-0")
          }
          style={{ left: `${Math.min(92, Math.max(8, hoverXPercent))}%` }}
        >
          <p className="text-ink-muted">Dia {String(displayed.day).padStart(2, "0")}</p>
          <p>{formatBRL(displayed.cumulativeCents)}</p>
        </div>
      )}

      {n === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-ink-muted">
          Ainda sem valores recebidos neste período.
        </p>
      )}
    </div>
  );
}

function niceCeil(value: number): number {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  let niceResidual: number;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 5) niceResidual = 5;
  else niceResidual = 10;
  return niceResidual * magnitude;
}

function formatCompactBRL(reais: number): string {
  if (reais >= 1000) return `${Math.round(reais / 1000)}k`;
  return String(Math.round(reais));
}
