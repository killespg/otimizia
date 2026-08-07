"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/design-system/user-avatar";
import { useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { LogoWordmark } from "@/components/design-system/logo";
import { TimIcon } from "@/components/design-system/tim-icon";

export function ProductTopbar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/painel/contatos?busca=${encodeURIComponent(value)}` : "/painel/contatos");
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 px-3 py-2 md:px-6">
      <div className="flex min-w-0 items-center md:hidden"><LogoWordmark height={22} /></div>
      <form data-liquid-glass-search onSubmit={search} role="search" className="liquid-glass-control hidden min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-4 md:flex md:max-w-sm">
        <Search size={15} className="shrink-0 text-od-text-3" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar contatos" placeholder="Buscar cliente ou contato" className="!min-h-0 !border-0 !bg-transparent !p-0 text-[13px] !shadow-none outline-none placeholder:text-od-text-3" />
      </form>
      <div data-liquid-glass-actions className="liquid-glass-control flex shrink-0 items-center rounded-full p-1">
        <Link href="/painel/assistente" aria-label="Abrir conversa com o Tim" className="grid size-11 place-items-center rounded-md text-od-text-3 hover:bg-white/[0.045] hover:text-od-text"><TimIcon size={17} /></Link>
        <Link href="/painel/tarefas" aria-label="Ver lembretes" className="relative grid size-11 place-items-center rounded-md text-od-text-3 hover:bg-white/[0.045] hover:text-od-text"><Bell size={17} /><span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-od-accent" /></Link>
        <Link href="/painel/configuracoes" aria-label="Abrir sua conta">
          <UserAvatar name={displayName} photoUrl={avatarUrl} className="size-11 bg-white/[0.07] text-xs font-semibold text-od-text-2" />
        </Link>
      </div>
    </header>
  );
}
