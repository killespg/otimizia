"use client";

import Link from "next/link";
import {
  AccountSettingsButton,
  type NotificationPreferences,
} from "@/components/design-system/account-settings-button";
import { useRouter } from "next/navigation";
import { Bell, Maximize2, MessageSquare, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { LogoWordmark } from "@/components/design-system/logo";

export function LegalProductTopbar({ displayName, avatarUrl, reminderCount, notificationPreferences }: { displayName: string; avatarUrl: string | null; reminderCount: number; notificationPreferences: NotificationPreferences }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/painel/juridico/processos?busca=${encodeURIComponent(value)}` : "/painel/juridico/processos");
  }

  async function fullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-16 items-center gap-3 px-3 py-2 md:px-6">
      <div className="flex min-w-0 items-center md:hidden"><LogoWordmark height={22}/></div>
      <form data-liquid-glass-search onSubmit={search} role="search" className="liquid-glass-control hidden min-h-11 min-w-0 max-w-96 flex-1 items-center gap-2 rounded-full px-4 md:flex">
        <Search size={14} className="shrink-0 text-od-text-3"/>
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar cliente, processo ou caso" placeholder="Buscar cliente, processo ou caso" className="!min-h-0 !border-0 !bg-transparent !p-0 text-[13px] !shadow-none outline-none placeholder:text-od-text-3"/>
      </form>
      <div data-liquid-glass-actions className="liquid-glass-control ml-auto flex items-center rounded-full p-1">
        <Link href="/painel/assistente" aria-label="Abrir mensagens" className="grid size-11 place-items-center rounded-lg text-od-text-3 hover:bg-white/[0.045] hover:text-od-text"><MessageSquare size={16}/></Link>
        <button type="button" onClick={fullscreen} aria-label="Tela cheia" className="hidden size-11 place-items-center rounded-lg text-od-text-3 hover:bg-white/[0.045] hover:text-od-text sm:grid"><Maximize2 size={15}/></button>
        {/* Bolinha fixa trocada pelo contador real de prazos e lembretes vencidos. */}
        <Link href="/painel/tarefas" aria-label="Ver alertas" className="relative grid size-11 place-items-center rounded-lg text-od-text-3 hover:bg-white/[0.045] hover:text-od-text">
          <Bell size={16} />
          {reminderCount > 0 ? <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#fb7767] px-1 text-xs font-bold text-white">{Math.min(reminderCount, 99)}</span> : null}
        </Link>
        <AccountSettingsButton
          displayName={displayName}
          avatarUrl={avatarUrl}
          notificationPreferences={notificationPreferences}
        />
      </div>
    </header>
  );
}
