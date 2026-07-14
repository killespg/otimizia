"use client";

import { useEffect, useRef } from "react";

type MapProperty = { id: string; title: string; latitude: number; longitude: number };

// Leaflet não é dependência do projeto (ver decisão no commit) — window.L
// só existe depois do script CDN carregar, então fica tipado como unknown/any
// aqui de propósito (não há @types/leaflet instalado).
type LeafletGlobal = {
  map: (el: HTMLElement) => { setView: (center: [number, number], zoom: number) => unknown; remove: () => void };
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (map: unknown) => unknown };
  marker: (coords: [number, number]) => { addTo: (map: unknown) => { bindPopup: (text: string) => unknown } };
};

// RE-7xx (Fase 7): "mapa de imóveis" sem geocodificação automática (sem
// credencial de Google Maps/Mapbox) — só plota imóveis com latitude/
// longitude preenchidos manualmente (ver PropertyAddressFields). Leaflet +
// tiles do OpenStreetMap carregados via CDN em vez de `npm install
// leaflet` — evita puxar dependência nova só pra esta fase; se o mapa
// virar recurso central do produto, vale trocar por um pacote de verdade.
export function PropertyMap({ properties }: { properties: MapProperty[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (properties.length === 0 || !containerRef.current) return;
    let map: unknown;
    let cancelled = false;

    async function init() {
      const w = window as unknown as { L?: LeafletGlobal };
      if (!w.L) {
        await new Promise<void>((resolve, reject) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Falha ao carregar o mapa."));
          document.body.appendChild(script);
        }).catch(() => {});
      }
      if (cancelled || !containerRef.current) return;
      const L = (window as unknown as { L?: LeafletGlobal }).L;
      if (!L) return;

      const instance = L.map(containerRef.current).setView([properties[0].latitude, properties[0].longitude], 12);
      map = instance;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(instance);

      for (const property of properties) {
        L.marker([property.latitude, property.longitude]).addTo(instance).bindPopup(property.title);
      }
    }

    init();
    return () => {
      cancelled = true;
      (map as { remove?: () => void } | undefined)?.remove?.();
    };
  }, [properties]);

  if (properties.length === 0) {
    return <p className="p-5 text-sm font-medium text-ink-muted">Nenhum imóvel com coordenadas cadastradas ainda.</p>;
  }

  return <div ref={containerRef} className="h-[480px] w-full rounded-lg" />;
}
