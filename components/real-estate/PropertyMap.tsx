"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";

type MapProperty = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  coverUrl: string | null;
  priceLabel: string;
  neighborhood: string;
  typeLabel: string;
  statusLabel: string;
  facts: string;
  href: string;
};

const POPUP_STYLE_ID = "pm-popup-style";

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
  const cover = property.coverUrl
    ? `<img class="pm-img" src="${esc(property.coverUrl)}" alt="Foto de ${esc(property.title)}" loading="lazy" />`
    : `<div class="pm-img pm-noimg">sem foto</div>`;
  const status = property.statusLabel
    ? `<span class="pm-status">${esc(property.statusLabel)}</span>`
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
.leaflet-container{background:#151419;font-family:inherit}
.leaflet-popup-content-wrapper{background:#201f26;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;box-shadow:0 12px 34px rgba(0,0,0,.55);padding:0;overflow:hidden}
.leaflet-popup-content{margin:0;width:238px!important}
.leaflet-popup-tip{background:#201f26;border:1px solid rgba(255,255,255,.12)}
.leaflet-popup-close-button{color:rgba(255,255,255,.55)!important;top:6px!important;right:6px!important}
.leaflet-container a.leaflet-popup-close-button:hover{color:#fff!important}
.pm-card{display:block;text-decoration:none;color:inherit}
.pm-img{display:block;width:100%;height:122px;object-fit:cover;background:#2a2732}
.pm-noimg{display:flex;align-items:center;justify-content:center;font-size:12px;color:rgba(255,255,255,.3)}
.pm-info{padding:10px 12px 12px}
.pm-row1{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}
.pm-type{font-size:11px;font-weight:600;color:#c4b5fd}
.pm-status{font-size:10px;font-weight:600;color:rgba(255,255,255,.62);background:rgba(255,255,255,.08);padding:1px 7px;border-radius:4px}
.pm-title{font-size:13px;font-weight:600;color:#fff;line-height:1.3}
.pm-neigh{font-size:11px;color:rgba(255,255,255,.5);margin-top:2px}
.pm-price{font-size:15px;font-weight:700;color:#fff;margin-top:7px}
.pm-facts{font-size:11px;color:rgba(255,255,255,.55);margin-top:4px}
.pm-link{display:inline-block;margin-top:9px;font-size:12px;font-weight:600;color:#a78bfa}
.pm-card:hover .pm-link{color:#c4b5fd}
.leaflet-bar a{background:#201f26;color:#fff;border-color:rgba(255,255,255,.12)}
.leaflet-bar a:hover{background:#2a2732}
.leaflet-control-attribution{background:rgba(21,20,25,.7)!important;color:rgba(255,255,255,.4)!important}
.leaflet-control-attribution a{color:rgba(255,255,255,.55)!important}
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

        const layer = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution: "&copy; OpenStreetMap &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20,
          },
        );
        layer.once("tileerror", () => {
          if (!cancelled) setStatus("error");
        });
        layer.addTo(instance);

        const icon = L.divIcon({
          className: "pm-pin",
          html:
            '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M13 0C5.82 0 0 5.82 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.82 20.18 0 13 0z" fill="#8b5cf6" stroke="#ffffff" stroke-width="1.5"/>' +
            '<circle cx="13" cy="13" r="4.4" fill="#ffffff"/></svg>',
          iconSize: [26, 34],
          iconAnchor: [13, 34],
          popupAnchor: [0, -30],
        });

        for (const property of properties) {
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
      <div className="rounded-md border border-white/[0.09] bg-white/[0.02] p-8 text-center text-sm font-medium text-ink-muted">
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
        <div className="absolute inset-0 grid place-items-center bg-[#151419]/75 text-sm font-medium text-white/62">
          Carregando mapa…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-[#151419]/90 p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-white">
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
