"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Maximize2, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { LogoWordmark } from "@/components/design-system/logo";
import {
  OperationSummaryButton,
  type OperationSummary,
} from "@/components/real-estate/operation-summary-button";
import {
  QuickSettingsButton,
  type NotificationPreferences,
} from "@/components/real-estate/quick-settings-button";

export function RealEstateProductTopbar({
  displayName,
  avatarUrl,
  visitCount,
  operationSummary,
  notificationPreferences,
}: {
  displayName: string;
  avatarUrl: string | null;
  visitCount: number;
  operationSummary: OperationSummary;
  notificationPreferences: NotificationPreferences;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/painel/imoveis?q=${encodeURIComponent(value)}` : "/painel/imoveis");
  }

  async function fullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-16 items-center gap-3 px-3 py-2 md:px-6">
      <div className="flex min-w-0 items-center md:hidden"><LogoWordmark height={22} /></div>
      <form data-liquid-glass-search onSubmit={search} role="search" className="liquid-glass-control hidden min-h-11 min-w-0 max-w-[380px] flex-1 items-center gap-2 rounded-full px-4 md:flex">
        <Search size={14} className="shrink-0 text-od-text-3" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar imóvel" placeholder="Buscar imóvel, bairro ou cidade" className="!min-h-0 !border-0 !bg-transparent !p-0 text-[13px] !shadow-none outline-none placeholder:text-od-text-3" />
      </form>
      {/* O ícone de chat e o link de conta saíram daqui: o resumo da operação e
          as configurações rápidas assumiram o lugar deles, e o Tim é alcançado
          pela própria chamada do painel e pela barra do celular. Manter os dois
          antigos duplicaria o mesmo destino lado a lado. */}
      <div data-liquid-glass-actions className="liquid-glass-control ml-auto flex items-center rounded-full p-1">
        <button type="button" onClick={fullscreen} aria-label="Tela cheia" className="hidden size-11 place-items-center rounded-lg text-od-text-3 hover:bg-white/[0.045] hover:text-od-text sm:grid"><Maximize2 size={15} /></button>
        <Link href="/painel/imoveis/visitas" aria-label="Ver visitas" className="relative grid size-11 place-items-center rounded-lg text-od-text-3 hover:bg-white/[0.045] hover:text-od-text">
          <CalendarDays size={16} />
          {visitCount > 0 ? <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#fb7767] px-1 text-xs font-bold text-white">{Math.min(visitCount, 99)}</span> : null}
        </Link>
        <Link href="/painel/imoveis" aria-label="Abrir carteira" className="hidden size-11 place-items-center rounded-lg text-od-text-3 hover:bg-white/[0.045] hover:text-od-text sm:grid"><Building2 size={16} /></Link>
        <OperationSummaryButton {...operationSummary} />
        <QuickSettingsButton
          displayName={displayName}
          avatarUrl={avatarUrl}
          notificationPreferences={notificationPreferences}
        />
      </div>
    </header>
  );
}
