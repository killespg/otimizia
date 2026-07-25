"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Maximize2, MessageSquare, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { LogoWordmark } from "@/components/design-system/logo";

export function RealEstateProductTopbar({ initials, visitCount }: { initials: string; visitCount: number }) {
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
    <header className="sticky top-0 z-40 flex min-h-14 items-center border-b border-white/[0.05] bg-[#151419] px-4 md:px-8">
      <div className="flex min-w-0 items-center md:hidden"><LogoWordmark height={22} /></div>
      <form onSubmit={search} role="search" className="ml-4 hidden min-w-0 max-w-[380px] flex-1 items-center gap-2 rounded bg-[#1e1d22] px-3 py-1.5 focus-within:ring-2 focus-within:ring-od-accent/30 md:ml-0 md:flex">
        <Search size={14} className="shrink-0 text-white/40" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar imóvel" placeholder="Buscar imóvel, bairro ou cidade" className="!min-h-0 !border-0 !bg-transparent !p-0 text-[13px] !shadow-none outline-none placeholder:text-white/45" />
      </form>
      <div className="ml-auto flex items-center gap-0.5">
        <Link href="/painel/assistente" aria-label="Abrir conversa com o Tim" className="grid size-11 place-items-center rounded-lg text-white/45 hover:bg-white/[0.05] hover:text-white"><MessageSquare size={16} /></Link>
        <button type="button" onClick={fullscreen} aria-label="Tela cheia" className="hidden size-11 place-items-center rounded-lg text-white/45 hover:bg-white/[0.05] hover:text-white sm:grid"><Maximize2 size={15} /></button>
        <Link href="/painel/imoveis/visitas" aria-label="Ver visitas" className="relative grid size-11 place-items-center rounded-lg text-white/45 hover:bg-white/[0.05] hover:text-white">
          <CalendarDays size={16} />
          {visitCount > 0 ? <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#fb7767] px-1 text-[9px] font-bold text-white">{Math.min(visitCount, 99)}</span> : null}
        </Link>
        <Link href="/painel/imoveis" aria-label="Abrir carteira" className="hidden size-11 place-items-center rounded-lg text-white/45 hover:bg-white/[0.05] hover:text-white sm:grid"><Building2 size={16} /></Link>
        <Link href="/painel/configuracoes" aria-label="Abrir conta" className="ml-1 grid size-8 place-items-center rounded-full bg-white/[0.08] text-xs font-bold text-white/70">{initials}</Link>
      </div>
    </header>
  );
}
