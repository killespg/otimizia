"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { ChevronRight, Pin, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  danger?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

/** Submenu opcional pendurado num item pai, com divulgação própria. */
export type NavSubmenu = {
  parentHref: string;
  items: Array<{ href: string; label: string }>;
};

type Props = {
  /** Prefixo das chaves de localStorage. Uma vertical não herda a preferência da outra. */
  namespace: string;
  groups: NavGroup[];
  collapsed: boolean;
  pathname: string;
  /** Itens que sobem pro topo antes de o usuário mexer. */
  defaultPinned?: string[];
  submenu?: NavSubmenu;
};

export function isCurrent(pathname: string, item: Pick<NavItem, "href" | "exact">) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function readList(key: string): string[] | null {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : null;
  } catch {
    // storage corrompido nao pode derrubar a navegacao
    return null;
  }
}

/**
 * Grupos, submenu e fixados da navegação de produto.
 *
 * Existia uma cópia disto em cada vertical, e as quatro já divergiam em altura,
 * tipografia e raio para o mesmo papel — o que o DESIGN.md proíbe. Aqui a
 * gramática é única; cada vertical só declara seus grupos.
 */
export function ProductNavGroups({ namespace, groups, collapsed, pathname, defaultPinned = [], submenu }: Props) {
  const closedKey = `otimizia-${namespace}-nav-closed`;
  const pinnedKey = `otimizia-${namespace}-nav-pinned`;
  const submenuKey = `otimizia-${namespace}-nav-submenu`;

  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>(defaultPinned);
  const [submenuOpen, setSubmenuOpen] = useState(true);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedClosed = readList(closedKey);
      if (savedClosed) setClosedGroups(savedClosed);
      const savedPinned = readList(pinnedKey);
      if (savedPinned) setPinned(savedPinned);
      setSubmenuOpen(window.localStorage.getItem(submenuKey) !== "0");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [closedKey, pinnedKey, submenuKey]);

  // O efeito fica fora do updater: em StrictMode o React invoca o updater duas
  // vezes, e escrita no storage dentro dele dispara em duplicado.
  function toggleGroup(label: string) {
    const next = closedGroups.includes(label) ? closedGroups.filter((item) => item !== label) : [...closedGroups, label];
    setClosedGroups(next);
    window.localStorage.setItem(closedKey, JSON.stringify(next));
  }

  function togglePin(href: string) {
    const next = pinned.includes(href) ? pinned.filter((item) => item !== href) : [...pinned, href];
    setPinned(next);
    window.localStorage.setItem(pinnedKey, JSON.stringify(next));
  }

  function toggleSubmenu() {
    const next = !submenuOpen;
    setSubmenuOpen(next);
    window.localStorage.setItem(submenuKey, next ? "1" : "0");
  }

  // O primeiro grupo é a âncora: fica no topo e seus itens não são fixáveis,
  // porque já estão lá e desafixá-los deixaria a navegação sem base.
  const anchor = groups[0];
  const anchorHrefs = new Set((anchor?.items ?? []).map((item) => item.href));
  const pinnable = groups.slice(1).flatMap((group) => group.items);
  const pinnedItems = pinned
    .map((href) => pinnable.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const pinnedHrefs = new Set(pinnedItems.map((item) => item.href));

  // Fixado sobe pro grupo âncora e sai do de origem: subir sem sair faria o
  // item aparecer duas vezes na mesma navegação.
  const resolved: NavGroup[] = groups
    .map((group, index) =>
      index === 0
        ? { ...group, items: [...group.items, ...pinnedItems] }
        : { ...group, items: group.items.filter((item) => !pinnedHrefs.has(item.href)) },
    )
    .filter((group) => group.items.length > 0);

  function Item({ item }: { item: NavItem }) {
    const active = isCurrent(pathname, item);
    const Icon = item.icon;

    if (collapsed) {
      return <Link
        href={item.href}
        prefetch={true}
        title={item.label}
        aria-current={active ? "page" : undefined}
        className={`group mx-auto flex size-9 min-h-8 items-center justify-center rounded-xl text-[13px] transition-colors ${active ? "bg-white/[0.075] font-semibold text-white" : "text-white/58 hover:bg-white/[0.045] hover:text-white"}`}
      >
        <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-od-text-2" : "text-white/55 group-hover:text-white/75"} />
      </Link>;
    }

    const isPinned = pinned.includes(item.href);
    const canPin = !anchorHrefs.has(item.href);
    const hasBadge = typeof item.badge === "number" && item.badge > 0;
    const showDisclosure = submenu?.parentHref === item.href;

    // O realce mora no contêiner e link, contador e alfinete ficam dentro dele:
    // um retângulo só, e nenhum elemento clicável aninhado dentro do link.
    return <div className={`group flex min-h-8 items-center rounded-xl pr-1 transition-colors ${active ? "bg-white/[0.075]" : "hover:bg-white/[0.045]"}`}>
      <Link
        href={item.href}
        prefetch={true}
        aria-current={active ? "page" : undefined}
        className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 text-[13px] ${active ? "font-semibold text-white" : "text-white/58 group-hover:text-white"}`}
      >
        <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-od-text-2" : "text-white/55 group-hover:text-white/75"} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
      {showDisclosure ? (
        <button
          type="button"
          onClick={toggleSubmenu}
          aria-expanded={submenuOpen}
          aria-controls={`nav-sub-${namespace}`}
          title={submenuOpen ? "Recolher" : "Expandir"}
          className="grid size-6 shrink-0 place-items-center text-od-text-3 transition-colors hover:text-white"
        >
          <ChevronRight size={13} className={`transition-transform duration-150 ${submenuOpen ? "rotate-90" : ""}`} />
        </button>
      ) : null}
      {/* Contador e alfinete dividem a mesma vaga, trocando no hover. Em vagas
          separadas o alfinete roubava 24px fixos e truncava rótulos longos
          mesmo sem ninguém passar o mouse. */}
      {canPin || hasBadge ? (
        <span className="relative grid min-w-6 shrink-0 place-items-center px-1">
          {hasBadge ? (
            <span className={`text-xs font-semibold tabular-nums transition-opacity ${canPin ? "group-hover:opacity-0" : ""} ${item.danger ? "text-[#fb7767]" : "text-white/65"}`}>{item.badge}</span>
          ) : null}
          {canPin ? (
            <button
              type="button"
              onClick={() => togglePin(item.href)}
              aria-pressed={isPinned}
              title={isPinned ? "Desafixar do topo" : "Fixar no topo"}
              className={`absolute inset-0 grid place-items-center text-od-text-3 transition-opacity hover:text-white ${isPinned ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
            >
              <Pin size={12} className={isPinned ? "fill-current" : ""} />
            </button>
          ) : null}
        </span>
      ) : null}
    </div>;
  }

  return <>
    {resolved.map((group) => {
      const closed = closedGroups.includes(group.label);
      // Recolhido em ícones não há rótulo pra clicar, então lá o grupo é sempre
      // mostrado — senão itens sumiriam sem controle visível.
      const hidden = closed && !collapsed && group.label !== "";
      return <section key={group.label || "__anchor"} className="mb-0 p-2">
        {!collapsed && group.label ? (
          <button
            type="button"
            onClick={() => toggleGroup(group.label)}
            aria-expanded={!closed}
            aria-controls={`nav-grupo-${group.label}`}
            className="flex h-7 w-full items-center gap-1.5 px-2 text-xs font-medium text-od-text-3 transition-colors hover:text-white/60"
          >
            <ChevronRight size={11} className={`shrink-0 transition-transform duration-150 ${closed ? "" : "rotate-90"}`} />
            <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
            {/* Recolher o grupo da página atual escondia o item ativo e o
                usuário perdia a referência de onde está. */}
            {closed && group.items.some((item) => isCurrent(pathname, item)) ? (
              <span className="size-1.5 shrink-0 rounded-full bg-od-accent" aria-label="Contém a página atual" />
            ) : null}
            {closed ? <span className="text-xs tabular-nums text-od-text-3">{group.items.length}</span> : null}
          </button>
        ) : null}
        {!hidden ? (
          <div id={group.label ? `nav-grupo-${group.label}` : undefined}>
            {group.items.map((item) => <Fragment key={item.href + item.label}>
              <Item item={item} />
              {submenu && submenu.parentHref === item.href && !collapsed && submenuOpen ? (
                <div id={`nav-sub-${namespace}`} className="mx-3.5 flex translate-x-px flex-col gap-1 border-l border-white/[0.08] px-2.5 py-0.5">
                  {submenu.items.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`flex h-7 -translate-x-px items-center rounded-xl px-2 text-[12px] ${pathname === sub.href ? "bg-white/[0.055] font-medium text-white" : "text-od-text-3 hover:text-white"}`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </Fragment>)}
          </div>
        ) : null}
      </section>;
    })}
  </>;
}
