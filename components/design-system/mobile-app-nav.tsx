"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Plus, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/design-system/logo";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  danger?: boolean;
};

export type MobileNavGroup = { label: string; items: MobileNavItem[] };

type Props = {
  // As três abas fixas (esquerda do "+" e uma à direita). O "+" central e o
  // Tim são adicionados pelo componente.
  tabs: [MobileNavItem, MobileNavItem, MobileNavItem];
  timHref: string;
  // Tudo, agrupado — abre no painel "+".
  groups: MobileNavGroup[];
  // Ações rápidas de criar (ex.: "Novo imóvel") destacadas no topo do painel.
  quickActions?: MobileNavItem[];
  ariaLabel: string;
};

function isCurrent(pathname: string, item: { href: string; exact?: boolean }) {
  const base = item.href.split("#")[0];
  if (item.exact) return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Barra de navegação estilo aplicativo para o celular: três abas, um "+"
// central elevado que abre um painel animado com todas as áreas, e o Tim
// sempre a um toque. Substitui a barra fixa antiga em todas as verticais —
// a sidebar do desktop não é tocada.
export function MobileAppNav({ tabs, timHref, groups, quickActions, ariaLabel }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Destaque otimista: a aba tocada acende na hora, antes de a rota carregar,
  // pra o toque parecer instantâneo mesmo com a página buscando dados.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setOpen(false);
    setPendingHref(null);
  }, [pathname]);

  // Rede de segurança: se a navegação não acontecer (erro, cancelada), limpa
  // o destaque otimista pra não ficar preso numa aba errada.
  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 4000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Aba ativa considera o destaque otimista primeiro; sem ele, cai no caminho
  // atual da rota.
  const tabActive = (item: { href: string; exact?: boolean }) =>
    pendingHref ? pendingHref === item.href : isCurrent(pathname, item);
  const timActive = pendingHref ? pendingHref === timHref : isCurrent(pathname, { href: timHref });
  const anyGroupActive = groups.some((group) => group.items.some((item) => isCurrent(pathname, item)));

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[var(--z-dropdown)] bg-black/25 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          />
        ) : null}
      </AnimatePresence>

      <div
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {/* Painel de "todas as áreas": mesma largura da barra, cresce dela
              pra cima — uma extensão animada da barra, não um sheet de tela
              cheia. Rola por dentro se passar da altura máxima. */}
          <AnimatePresence>
            {open ? (
              <motion.section
                role="dialog"
                aria-modal="true"
                aria-label="Todas as áreas"
                style={{ transformOrigin: "bottom center" }}
                className="max-h-[56dvh] overflow-y-auto rounded-[22px] border border-white/[0.09] bg-[#18161d]/95 shadow-[0_16px_44px_-14px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 360 }}
              >
                <Link
                  href={timHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3 active:bg-white/[0.03]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-od-accent">
                    <LogoMark size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-od-text">Falar com o Tim</span>
                    <span className="block text-[12px] text-white/50">Seu parceiro de negócios</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-white/30" />
                </Link>

                {quickActions && quickActions.length > 0 ? (
                  <MenuGroup label="Criar">
                    {quickActions.map((action, index) => (
                      <MenuRow
                        key={action.href + action.label}
                        href={action.href}
                        icon={action.icon}
                        label={action.label}
                        accentIcon
                        index={index}
                        reduceMotion={reduceMotion}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </MenuGroup>
                ) : null}

                {groups.map((group, groupIndex) => (
                  <MenuGroup key={group.label || `grp-${groupIndex}`} label={group.label}>
                    {group.items.map((item, index) => (
                      <MenuRow
                        key={item.href + item.label}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        badge={item.badge}
                        danger={item.danger}
                        active={isCurrent(pathname, item)}
                        index={index}
                        reduceMotion={reduceMotion}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </MenuGroup>
                ))}
                <div className="h-2" />
              </motion.section>
            ) : null}
          </AnimatePresence>

          <nav
            data-mobile-nav
            className="relative flex items-stretch gap-0.5 rounded-[24px] border border-white/[0.09] bg-[#18161d]/85 p-1.5 shadow-[0_14px_40px_-12px_rgba(0,0,0,0.78)] backdrop-blur-2xl"
            aria-label={ariaLabel}
          >
            <BarTab item={tabs[0]} active={tabActive(tabs[0])} onTap={() => setPendingHref(tabs[0].href)} />
            <BarTab item={tabs[1]} active={tabActive(tabs[1])} onTap={() => setPendingHref(tabs[1].href)} />

            {/* Espaçador central com a MESMA largura das abas (flex-1): mantém
                os 5 slots iguais (espaçamento uniforme) e reserva o meio pro
                "+", que é posicionado de forma absoluta no centro exato da
                barra — sempre alinhado ao centro da tela. */}
            <div className="flex-1" aria-hidden="true" />

            <BarTab item={tabs[2]} active={tabActive(tabs[2])} onTap={() => setPendingHref(tabs[2].href)} />
            <TimTab href={timHref} active={timActive} onTap={() => setPendingHref(timHref)} />

            {/* Wrapper faz a centralização (transform estático); o botão anima
                só rotação/escala — separados pra o framer-motion não
                sobrescrever o translate de centralização. */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={open ? "Fechar menu" : "Abrir todas as áreas"}
                whileTap={{ scale: 0.9 }}
                animate={{ rotate: open ? 45 : 0, backgroundColor: anyGroupActive && !open ? "#7146dc" : "#8b5cf6" }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", damping: 18, stiffness: 320 }}
                className="grid size-12 place-items-center rounded-full text-white shadow-[0_6px_18px_-6px_rgba(139,92,246,0.85)]"
              >
                <Plus size={22} strokeWidth={2.4} />
              </motion.button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}

function BarTab({ item, active, onTap }: { item: MobileNavItem; active: boolean; onTap?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      onClick={onTap}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 text-[10px] transition-colors ${active ? "text-white" : "text-white/50"}`}
    >
      {active ? (
        <motion.span layoutId="mobile-tab-active" className="absolute inset-0 rounded-[18px] bg-white/[0.07]" transition={{ type: "spring", damping: 30, stiffness: 400 }} />
      ) : null}
      <span className="relative shrink-0">
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-od-text-2" : ""} />
        {typeof item.badge === "number" && item.badge > 0 ? (
          <span className={`absolute -right-2 -top-1.5 min-w-4 rounded-full px-1 text-[9px] font-semibold leading-4 tabular-nums ${item.danger ? "bg-[#fb7767] text-[#3a0f0a]" : "bg-white/20 text-white"}`}>
            {item.badge}
          </span>
        ) : null}
      </span>
      <span className="relative max-w-full truncate">{item.label}</span>
    </Link>
  );
}

function MenuGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div>
      {label ? (
        <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40">{label}</p>
      ) : (
        <div className="pt-2" />
      )}
      {children}
    </div>
  );
}

// Uma linha do menu "todas as áreas": superfície plana, separada por
// divisória fina — sem card, sem caixa por item. Estado ativo é acento, não
// um retângulo preenchido.
function MenuRow({
  href,
  icon: Icon,
  label,
  badge,
  danger,
  active,
  accentIcon,
  index,
  reduceMotion,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  danger?: boolean;
  active?: boolean;
  accentIcon?: boolean;
  index: number;
  reduceMotion: boolean | null;
  onNavigate: () => void;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { delay: Math.min(index * 0.015, 0.12), duration: 0.16 }}
    >
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-12 items-center gap-3 px-4 active:bg-white/[0.02] ${index === 0 ? "" : "border-t border-white/[0.06]"}`}
      >
        <Icon size={18} className={active || accentIcon ? "text-od-text-2" : "text-white/55"} />
        <span className={`min-w-0 flex-1 truncate text-[14px] ${active ? "font-semibold text-white" : "text-white/78"}`}>{label}</span>
        {typeof badge === "number" && badge > 0 ? (
          <span className={`text-[12px] font-semibold tabular-nums ${danger ? "text-[#fb7767]" : "text-white/55"}`}>{badge}</span>
        ) : null}
        {active ? <span className="size-1.5 shrink-0 rounded-full bg-od-accent" /> : null}
      </Link>
    </motion.div>
  );
}

function TimTab({ href, active, onTap }: { href: string; active: boolean; onTap?: () => void }) {
  return (
    <Link
      href={href}
      prefetch
      onClick={onTap}
      aria-current={active ? "page" : undefined}
      aria-label="Falar com o Tim"
      className={`relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 text-[10px] transition-colors ${active ? "text-white" : "text-white/55"}`}
    >
      {active ? (
        <motion.span layoutId="mobile-tab-active" className="absolute inset-0 rounded-[18px] bg-white/[0.07]" transition={{ type: "spring", damping: 30, stiffness: 400 }} />
      ) : null}
      <span className={`relative grid size-6 shrink-0 place-items-center rounded-full ${active ? "bg-od-accent" : "bg-white/10"}`}>
        <LogoMark size={13} />
      </span>
      <span className="relative">Tim</span>
    </Link>
  );
}
