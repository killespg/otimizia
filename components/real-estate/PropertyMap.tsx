"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { DivIcon, Map as LeafletMap } from "leaflet";

type MapProperty = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  coverUrl: string | null;
  priceLabel: string;
  neighborhood: string;
  typeLabel: string;
  statusKey: string;
  statusLabel: string;
  facts: string;
  href: string;
};

const POPUP_STYLE_ID = "pm-popup-style";

export const PROPERTY_MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

type PropertyMarkerTone = "active" | "completed" | "inactive" | "reserved";

const PROPERTY_MARKER_VISUALS: Record<
  PropertyMarkerTone,
  { fill: string; tone: PropertyMarkerTone }
> = {
  active: { fill: "#2F6FCC", tone: "active" },
  reserved: { fill: "#C47D1C", tone: "reserved" },
  completed: { fill: "#2D8A62", tone: "completed" },
  inactive: { fill: "#5E6978", tone: "inactive" },
};

export function propertyMarkerVisual(status: string) {
  if (status === "ativo") return PROPERTY_MARKER_VISUALS.active;
  if (status === "reservado") return PROPERTY_MARKER_VISUALS.reserved;
  if (status === "vendido" || status === "alugado") {
    return PROPERTY_MARKER_VISUALS.completed;
  }
  return PROPERTY_MARKER_VISUALS.inactive;
}

function esc(value: string) {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[
        character
      ] as string,
  );
}

function popupHtml(property: MapProperty) {
  const markerVisual = propertyMarkerVisual(property.statusKey);
  const cover = property.coverUrl
    ? `<img class="pm-img" src="${esc(property.coverUrl)}" alt="Foto de ${esc(property.title)}" loading="lazy" />`
    : `<div class="pm-img pm-noimg">sem foto</div>`;
  const status = property.statusLabel
    ? `<span class="pm-status" style="--pm-status-color:${markerVisual.fill}">${esc(property.statusLabel)}</span>`
    : "";
  const facts = property.facts
    ? `<div class="pm-facts">${esc(property.facts)}</div>`
    : "";
  return (
    `<a class="pm-card" href="${esc(property.href)}">${cover}` +
    `<div class="pm-info">` +
    `<div class="pm-row1"><span class="pm-type">${esc(property.typeLabel)}</span>${status}</div>` +
    `<div class="pm-title">${esc(property.title)}</div>` +
    `<div class="pm-neigh">${esc(property.neighborhood)}</div>` +
    `<div class="pm-price">${esc(property.priceLabel)}</div>` +
    `${facts}` +
    `<span class="pm-link">Ver imóvel →</span>` +
    `</div></a>`
  );
}

function injectStyle() {
  if (document.getElementById(POPUP_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = POPUP_STYLE_ID;
  style.textContent = `
.leaflet-container{background:#DCE6EC;font-family:inherit}
.leaflet-popup-content-wrapper{background:#15191F;color:#F5F7FA;border:1px solid #2D3540;border-radius:15px;box-shadow:none;padding:0;overflow:hidden}
.leaflet-popup-content{margin:0;width:238px!important}
.leaflet-popup-tip{background:#15191F;border:1px solid #2D3540}
.leaflet-popup-close-button{color:#98A2AF!important;top:6px!important;right:6px!important}
.leaflet-container a.leaflet-popup-close-button:hover{color:#F5F7FA!important}
.pm-card{display:block;text-decoration:none;color:inherit}
.pm-img{display:block;width:100%;height:122px;object-fit:cover;background:#1B2027}
.pm-noimg{display:flex;align-items:center;justify-content:center;font-size:12px;color:#7D8998}
.pm-info{padding:10px 12px 12px}
.pm-row1{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}
.pm-type{font-size:11px;font-weight:600;color:#91B6E7}
.pm-status{font-size:10px;font-weight:700;color:var(--pm-status-color);background:color-mix(in oklab,var(--pm-status-color) 16%,#15191F);border:1px solid color-mix(in oklab,var(--pm-status-color) 42%,#2D3540);padding:2px 7px;border-radius:999px}
.pm-title{font-size:13px;font-weight:600;color:#F5F7FA;line-height:1.3}
.pm-neigh{font-size:11px;color:#98A2AF;margin-top:2px}
.pm-price{font-size:15px;font-weight:700;color:#F5F7FA;margin-top:7px}
.pm-facts{font-size:11px;color:#98A2AF;margin-top:4px}
.pm-link{display:inline-block;margin-top:9px;font-size:12px;font-weight:600;color:#91B6E7}
.pm-card:hover .pm-link{color:#B8D1F1}
.leaflet-bar a{background:#15191F;color:#F5F7FA;border-color:#2D3540}
.leaflet-bar a:hover{background:#20262E;color:#F5F7FA}
.leaflet-control-attribution{background:rgba(245,247,250,.9)!important;color:#465465!important}
.leaflet-control-attribution a{color:#214A88!important}
.pm-legend{display:grid;gap:6px;background:#15191F;color:#F5F7FA;border:1px solid #2D3540;border-radius:11px;padding:9px 10px;font:600 11px/1.2 inherit}
.pm-legend-row{display:flex;align-items:center;gap:7px;white-space:nowrap}
.pm-legend-dot{width:8px;height:8px;border:1px solid #F5F7FA;border-radius:999px;background:var(--pm-legend-color)}
`;
  document.head.appendChild(style);
}

export function PropertyMap({ properties }: { properties: MapProperty[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (properties.length === 0 || !containerRef.current) return;
    let map: LeafletMap | undefined;
    let cancelled = false;

    async function init() {
      setStatus("loading");
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !containerRef.current) return;
        injectStyle();

        const instance = L.map(containerRef.current, {
          scrollWheelZoom: false,
        }).setView([properties[0].latitude, properties[0].longitude], 12);
        map = instance;

        const layer = L.tileLayer(PROPERTY_MAP_TILE_URL, {
            attribution: "&copy; OpenStreetMap &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20,
          });
        layer.once("tileerror", () => {
          if (!cancelled) setStatus("error");
        });
        layer.addTo(instance);

        const legend = new L.Control({ position: "bottomleft" });
        legend.onAdd = () => {
          const element = L.DomUtil.create("div", "pm-legend");
          element.setAttribute("aria-label", "Legenda dos imóveis");
          element.innerHTML =
            '<div class="pm-legend-row"><span class="pm-legend-dot" style="--pm-legend-color:#2F6FCC"></span>Ativo</div>' +
            '<div class="pm-legend-row"><span class="pm-legend-dot" style="--pm-legend-color:#C47D1C"></span>Reservado</div>' +
            '<div class="pm-legend-row"><span class="pm-legend-dot" style="--pm-legend-color:#2D8A62"></span>Vendido ou alugado</div>' +
            '<div class="pm-legend-row"><span class="pm-legend-dot" style="--pm-legend-color:#5E6978"></span>Rascunho ou inativo</div>';
          return element;
        };
        legend.addTo(instance);

        const icons = new Map<PropertyMarkerTone, DivIcon>();

        for (const property of properties) {
          const markerVisual = propertyMarkerVisual(property.statusKey);
          let icon = icons.get(markerVisual.tone);
          if (!icon) {
            icon = L.divIcon({
              className: "pm-pin",
              html:
                '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
                `<path d="M13 0C5.82 0 0 5.82 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.82 20.18 0 13 0z" fill="${markerVisual.fill}" stroke="#F5F7FA" stroke-width="1.5"/>` +
                '<circle cx="13" cy="13" r="4.4" fill="#ffffff"/></svg>',
              iconSize: [26, 34],
              iconAnchor: [13, 34],
              popupAnchor: [0, -30],
            });
            icons.set(markerVisual.tone, icon);
          }

          L.marker([property.latitude, property.longitude], { icon })
            .addTo(instance)
            .bindPopup(popupHtml(property), {
              maxWidth: 238,
              minWidth: 238,
              closeButton: true,
            });
        }

        if (properties.length > 1) {
          instance.fitBounds(
            L.latLngBounds(
              properties.map(
                (property) =>
                  [property.latitude, property.longitude] as [number, number],
              ),
            ),
            { padding: [56, 56], maxZoom: 15 },
          );
        }
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void init();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [attempt, properties]);

  if (properties.length === 0) {
    return (
      <div className="card-quiet p-8 text-center text-sm font-medium text-ink-muted">
        Nenhum imóvel com coordenadas cadastradas ainda.
      </div>
    );
  }

  return (
    <div className="relative min-h-[520px]">
      <div
        ref={containerRef}
        aria-label={`Mapa com ${properties.length} imóveis`}
        className="h-[520px] w-full overflow-hidden"
      />
      {status === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-[color:var(--od-bg)]/75 text-sm font-medium text-od-text-2">
          Carregando mapa…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-[color:var(--od-bg)]/90 p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-od-text">
              Não foi possível carregar o mapa agora.
            </p>
            <p className="mt-2 text-xs text-od-text-3">
              Os imóveis continuam disponíveis na carteira.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="btn-secondary mt-4 min-h-11"
            >
              <RefreshCw size={15} />
              Tentar novamente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
