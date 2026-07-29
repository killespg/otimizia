"use client";

import { useState } from "react";
import { IconSearch } from "@/app/(dashboard)/painel/icons";

// Filtro client-side das vitrines: cada <section> da lista tem
// data-vitrine + data-search (título + nome do cliente, minúsculo). Aqui só
// mostramos/escondemos por correspondência — evita rolar a lista inteira pra
// achar a seleção de um cliente. Como as vitrines já vêm renderizadas do
// servidor, o filtro é instantâneo e não refaz busca no banco.
export function VitrineSearch() {
  const [q, setQ] = useState("");

  function apply(value: string) {
    setQ(value);
    const term = value.trim().toLowerCase();
    const sections = document.querySelectorAll<HTMLElement>("[data-vitrine]");
    let visible = 0;
    sections.forEach((el) => {
      const match = !term || (el.dataset.search ?? "").includes(term);
      el.style.display = match ? "" : "none";
      if (match) visible += 1;
    });
    const empty = document.getElementById("vitrine-empty");
    if (empty) empty.style.display = term && visible === 0 ? "" : "none";
  }

  return (
    <div className="relative max-w-md">
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => apply(e.target.value)}
        placeholder="Buscar por cliente ou nome da vitrine…"
        aria-label="Buscar vitrine por cliente ou nome"
        className="w-full rounded border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-brand-600"
        style={{ minHeight: "2.75rem" }}
      />
    </div>
  );
}
