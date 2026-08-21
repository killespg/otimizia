"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  LogOut,
  Search,
  Settings,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { logout } from "@/app/(auth)/actions";
import { LogoWordmark } from "@/components/design-system/logo";
import { PendingButton } from "@/components/ui/PendingButton";
import type { ShellVariant } from "@/lib/design-system/navigation";

type Props = {
  displayName: string;
  initials: string;
  variant: ShellVariant;
  notificationCount?: number;
};

const notificationDestination: Record<ShellVariant, string> = {
  generic: "/tarefas",
  seller: "/tarefas",
  legal: "/juridico/prazos",
  "real-estate": "/imoveis/visitas",
};

type NotificationPopoverPanelProps = {
  destination: string;
  id?: string;
  notificationCount: number;
  onClose?: () => void;
  reduceMotion: boolean;
};

export function NotificationPopoverPanel({
  destination,
  id,
  notificationCount,
  onClose,
  reduceMotion,
}: NotificationPopoverPanelProps) {
  const pendingCount = Math.max(0, notificationCount);
  const hasPending = pendingCount > 0;
  const titleId = id ? `${id}-title` : undefined;

  return (
    <motion.div
      id={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      initial={
        reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }
      }
      transition={{
        duration: reduceMotion ? 0 : 0.16,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ transformOrigin: "top right" }}
      className="absolute right-0 top-[calc(100%+0.5rem)] z-[var(--z-dropdown)] w-72 overflow-hidden rounded-[var(--radius-panel)] border border-od-border bg-[var(--surface-primary)]"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p id={titleId} className="text-sm font-semibold text-od-text">
          Notificações
        </p>
        <span className="rounded-full bg-od-accent-tint px-2 py-1 text-[11px] font-semibold text-od-accent-soft">
          {hasPending ? `${pendingCount} pendente${pendingCount === 1 ? "" : "s"}` : "Tudo em dia"}
        </span>
      </div>
      <div className="border-t border-od-border px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-secondary)] text-od-accent-soft">
            {hasPending ? (
              <Bell size={16} aria-hidden />
            ) : (
              <CheckCircle2 size={16} aria-hidden />
            )}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[13px] font-semibold text-od-text">
              {hasPending
                ? pendingCount === 1
                  ? "1 notificação pendente"
                  : `${pendingCount} notificações pendentes`
                : "Nenhuma notificação pendente"}
            </p>
            <p className="mt-1 text-xs leading-5 text-od-text-3">
              {hasPending
                ? "Existem itens que pedem sua atenção."
                : "Você está em dia por aqui."}
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-od-border p-1">
        <Link
          href={destination}
          data-notification-popover-item
          onClick={onClose}
          className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 text-[13px] font-medium text-od-text-2 hover:bg-[var(--surface-hover)] hover:text-od-text"
        >
          <span>Ver todas as notificações</span>
          <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </motion.div>
  );
}

type OpenPopover = "account" | "notifications" | null;

export function ProductShellTopbar({
  displayName,
  initials,
  variant,
  notificationCount = 0,
}: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const accountMenuId = useId();
  const notificationMenuId = useId();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const accountMenuOpen = openPopover === "account";
  const notificationMenuOpen = openPopover === "notifications";

  useEffect(() => {
    if (!openPopover) return;

    const activeMenuRef =
      openPopover === "account" ? accountMenuRef : notificationMenuRef;
    const activeTriggerRef =
      openPopover === "account" ? accountTriggerRef : notificationTriggerRef;
    const initialFocusSelector =
      openPopover === "account"
        ? "[data-account-menu-item]"
        : "[data-notification-popover-item]";

    const focusFrame = window.requestAnimationFrame(() => {
      activeMenuRef.current
        ?.querySelector<HTMLElement>(initialFocusSelector)
        ?.focus();
    });

    function closeFromOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !activeMenuRef.current?.contains(event.target)
      ) {
        setOpenPopover(null);
      }
    }

    function closeFromKeyboard(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenPopover(null);
        activeTriggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [openPopover]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(
      value
        ? `/contatos?busca=${encodeURIComponent(value)}`
        : "/contatos",
    );
  }

  function moveAccountMenuFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const items = Array.from(
      accountMenuRef.current?.querySelectorAll<HTMLElement>(
        "[data-account-menu-item]",
      ) ?? [],
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowUp"
            ? (currentIndex - 1 + items.length) % items.length
            : (currentIndex + 1) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <header className="product-topbar sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-3 border-b border-od-border bg-[var(--surface-base)] pl-5 pr-2 sm:pl-6 sm:pr-2 lg:pl-8 lg:pr-3">
      <div className="flex min-w-0 items-center md:hidden">
        <LogoWordmark height={22} />
      </div>
      <form
        onSubmit={search}
        role="search"
        className="hidden min-w-0 flex-1 items-center gap-2 md:flex md:max-w-[360px]"
      >
        <label htmlFor="product-search" className="sr-only">
          Buscar contatos
        </label>
        <Search size={16} className="shrink-0 text-od-text-3" aria-hidden />
        <input
          id="product-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente ou contato"
          autoComplete="off"
          className="!min-h-11 !border-0 !bg-transparent !p-0 text-[13px] !shadow-none outline-none placeholder:text-od-text-3"
        />
      </form>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/assistente"
          aria-label="Abrir conversa com o Tim"
          className="grid size-11 place-items-center rounded-[var(--radius-control)] text-od-text-3 hover:bg-[var(--surface-hover)] hover:text-od-text"
        >
          <Bot size={18} />
        </Link>
        <div ref={notificationMenuRef} className="relative">
          <button
            ref={notificationTriggerRef}
            type="button"
            aria-label={
              notificationCount > 0
                ? `Abrir notificações: ${notificationCount} pendentes`
                : "Abrir notificações"
            }
            aria-haspopup="dialog"
            aria-expanded={notificationMenuOpen}
            aria-controls={notificationMenuId}
            onClick={() =>
              setOpenPopover((current) =>
                current === "notifications" ? null : "notifications",
              )
            }
            className="relative grid size-11 place-items-center rounded-[var(--radius-control)] text-od-text-3 hover:bg-[var(--surface-hover)] hover:text-od-text"
          >
            <Bell size={18} aria-hidden />
            {notificationCount > 0 ? (
              <span className="absolute right-2 top-2 min-w-4 rounded-full bg-od-accent px-1 text-center text-[10px] font-semibold leading-4 text-white">
                {Math.min(notificationCount, 99)}
              </span>
            ) : null}
          </button>

          <AnimatePresence initial={false}>
            {notificationMenuOpen ? (
              <NotificationPopoverPanel
                id={notificationMenuId}
                destination={notificationDestination[variant]}
                notificationCount={notificationCount}
                reduceMotion={Boolean(reduceMotion)}
                onClose={() => setOpenPopover(null)}
              />
            ) : null}
          </AnimatePresence>
        </div>
        <div ref={accountMenuRef} className="relative">
          <button
            ref={accountTriggerRef}
            type="button"
            aria-label={`Abrir menu da conta de ${displayName}`}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            aria-controls={accountMenuId}
            onClick={() =>
              setOpenPopover((current) =>
                current === "account" ? null : "account",
              )
            }
            className="grid size-11 place-items-center rounded-[var(--radius-control)] hover:bg-[var(--surface-hover)]"
          >
            <span className="grid size-9 place-items-center rounded-full bg-od-accent-tint text-xs font-semibold text-od-accent-soft">
              {initials}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {accountMenuOpen ? (
              <motion.div
                id={accountMenuId}
                role="menu"
                aria-label="Ações da conta"
                onKeyDown={moveAccountMenuFocus}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -4, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -4, scale: 0.98 }
                }
                transition={{
                  duration: reduceMotion ? 0 : 0.14,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ transformOrigin: "top right" }}
                className="absolute right-0 top-[calc(100%+0.5rem)] z-[var(--z-dropdown)] w-52 overflow-hidden rounded-[var(--radius-panel)] border border-od-border bg-[var(--surface-primary)] p-1"
              >
                <div role="presentation" className="px-3 py-2">
                  <p className="truncate text-[13px] font-semibold text-od-text">
                    {displayName}
                  </p>
                  <p className="mt-0.5 text-xs text-od-text-3">Sua conta</p>
                </div>
                <div role="separator" className="mx-2 border-t border-od-border" />
                <Link
                  href="/configuracoes"
                  role="menuitem"
                  data-account-menu-item
                  onClick={() => setOpenPopover(null)}
                  className="mt-1 flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-[13px] font-medium text-od-text-2 hover:bg-[var(--surface-hover)] hover:text-od-text"
                >
                  <Settings size={16} aria-hidden />
                  <span>Configurações da conta</span>
                </Link>
                <form action={logout} role="none">
                  <PendingButton
                    intent="quiet"
                    role="menuitem"
                    data-account-menu-item
                    pendingLabel="Saindo"
                    className="w-full justify-start px-3 text-[13px]"
                  >
                    <LogOut size={16} aria-hidden />
                    <span>Sair</span>
                  </PendingButton>
                </form>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
