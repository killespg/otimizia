"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Bot, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { LogoWordmark } from "@/components/design-system/logo";

export function ProductTopbar({ initials }: { initials: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/painel/contatos?busca=${encodeURIComponent(value)}` : "/painel/contatos");
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-white/[0.05] bg-[#171320]/96 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center md:hidden"><LogoWordmark height={22} /></div>
      <form onSubmit={search} role="search" className="hidden min-w-0 flex-1 items-center gap-2 border-b border-white/[0.12] py-2 md:flex md:max-w-sm">
        <Search size={15} className="shrink-0 text-white/35" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar contatos" placeholder="Buscar cliente ou contato" className="!min-h-0 !border-0 !bg-transparent !p-0 text-[13px] !shadow-none outline-none placeholder:text-white/35" />
      </form>
      <div className="flex shrink-0 items-center gap-1">
        <Link href="/painel/assistente" aria-label="Abrir conversa com o Tim" className="grid size-11 place-items-center rounded-md text-white/42 hover:bg-white/[0.05] hover:text-od-text"><Bot size={17} /></Link>
        <Link href="/painel/tarefas" aria-label="Ver lembretes" className="relative grid size-11 place-items-center rounded-md text-white/42 hover:bg-white/[0.05] hover:text-white"><Bell size={17} /><span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-od-accent" /></Link>
        <Link href="/painel/configuracoes" aria-label="Abrir sua conta" className="ml-1 grid size-8 place-items-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-white/75">{initials}</Link>
      </div>
    </header>
  );
}
