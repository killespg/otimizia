"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  HandCoins,
  LogOut,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { logout } from "@/app/(auth)/actions";
import { updateNotificationPreferences } from "@/app/(dashboard)/painel/configuracoes/notifications-actions";
import type { MobileDashboardGreeting } from "@/lib/real-estate/mobile-dashboard-greeting";

export type NotificationPreferences = {
  dailyPush: boolean;
  dailySummaryEmail: boolean;
  stalledDealEmail: boolean;
};

export type RealEstateDashboardHeaderProps = {
  displayName: string;
  activePropertyCount: number;
  greeting: Pick<MobileDashboardGreeting, "salutation" | "message">;
  requestedVisits: number;
  openOffers: number;
  overdueCommissions: number;
  notificationPreferences: NotificationPreferences;
};

type AttentionItem = {
  count: number;
  href: string;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
};

const NOTIFICATION_FIELDS = {
  daily_push: "dailyPush",
  daily_summary_email: "dailySummaryEmail",
  stalled_deal_email: "stalledDealEmail",
} as const;

/**
 * Uma linha de aviso do painel rápido.
 *
 * `updateNotificationPreferences` grava os três campos de uma vez e lê cada um
 * como "on"/ausente. Enviar só o campo alterado desligaria os outros dois — por
 * isso o formulário carrega os demais em campo escondido, com o valor atual.
 */
function NotificationToggle({
  field,
  label,
  enabled,
  preferences,
}: {
  field: keyof typeof NOTIFICATION_FIELDS;
  label: string;
  enabled: boolean;
  preferences: NotificationPreferences;
}) {
  const others = (Object.keys(NOTIFICATION_FIELDS) as (keyof typeof NOTIFICATION_FIELDS)[]).filter(
    (key) => key !== field,
  );

  return (
    <form action={updateNotificationPreferences}>
      {others
        .filter((key) => preferences[NOTIFICATION_FIELDS[key]])
        .map((key) => (
          <input key={key} type="hidden" name={key} value="on" />
        ))}
      {enabled ? null : <input type="hidden" name={field} value="on" />}

      <PendingButton
        className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors hover:bg-white/[0.055]"
        pendingLabel="Salvando"
      >
        <span className="min-w-0 flex-1 text-xs font-medium text-od-text-2">{label}</span>
        <span
          aria-hidden="true"
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            enabled ? "bg-violet-500" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
              enabled ? "left-[1.125rem]" : "left-0.5"
            }`}
          />
        </span>
        <span className="sr-only">{enabled ? "Desativar" : "Ativar"}</span>
      </PendingButton>
    </form>
  );
}

function displayIdentity(displayName: string) {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Corretor";
  const initials = `${nameParts[0]?.[0] ?? "C"}${nameParts.length > 1 ? nameParts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();

  return { firstName, initials };
}

export function RealEstateDashboardHeader({
  displayName,
  activePropertyCount,
  greeting,
  requestedVisits,
  openOffers,
  overdueCommissions,
  notificationPreferences,
}: RealEstateDashboardHeaderProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const { firstName, initials } = displayIdentity(displayName);
  const attentionCount = requestedVisits + openOffers + overdueCommissions;
  const attentionItems: AttentionItem[] = [
    {
      count: requestedVisits,
      href: "/painel/imoveis/visitas",
      label: "Visitas aguardando confirmação",
      icon: CalendarDays,
    },
    {
      count: openOffers,
      href: "/painel/funil",
      label: "Propostas em aberto",
      icon: FileText,
    },
    {
      count: overdueCommissions,
      href: "/painel/imoveis/comissoes",
      label: "Comissões vencidas",
      icon: HandCoins,
      danger: true,
    },
  ].filter((item) => item.count > 0);

  // Os dois painéis do cabeçalho fecham do mesmo jeito: clique fora ou Escape,
  // devolvendo o foco ao botão que os abriu.
  useEffect(() => {
    const active = open ? "summary" : settingsOpen ? "settings" : null;
    if (!active) return;

    const close = () => {
      if (active === "summary") setOpen(false);
      else setSettingsOpen(false);
    };

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
      const trigger = active === "summary" ? triggerRef : settingsTriggerRef;
      window.requestAnimationFrame(() => trigger.current?.focus());
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, settingsOpen]);

  return (
    <section
      ref={rootRef}
      data-dashboard-profile-header="true"
      className="relative space-y-3 md:space-y-4"
    >
      <div className="flex min-h-11 w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/[0.14] bg-violet-500/75 text-xs font-bold tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_24px_-16px_rgba(139,92,246,0.85)] md:size-12 md:text-sm"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p
              data-dashboard-greeting="true"
              className="truncate text-sm font-semibold tracking-[-0.01em] text-od-text md:text-base"
            >
              {greeting.salutation}, {firstName}!
            </p>
            <p
              data-dashboard-status="true"
              className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-od-text-3 md:text-xs"
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
              {activePropertyCount} {activePropertyCount === 1 ? "imóvel ativo" : "imóveis ativos"}
            </p>
          </div>
        </div>

        <div data-dashboard-primary-actions="true" className="flex shrink-0 items-center gap-1.5">
          <button
            ref={triggerRef}
            type="button"
            data-dashboard-notification-trigger="true"
            aria-label="Ver resumo da operação"
            aria-expanded={open}
            aria-controls="operation-summary"
            aria-haspopup="dialog"
            onClick={() => setOpen((value) => !value)}
            className="liquid-glass-control relative grid size-11 place-items-center rounded-full text-od-text-2 transition-colors hover:text-od-text"
          >
            <Bell size={17} />
            {attentionCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#12111a]">
                {attentionCount > 9 ? "9+" : attentionCount}
              </span>
            ) : null}
          </button>
          {/* Cadastrar imóvel saiu daqui: continua no menu "Mais > Criar" do
              celular e no botão da própria carteira. O lugar de destaque no
              cabeçalho passou a ser a conta. */}
          <button
            ref={settingsTriggerRef}
            type="button"
            data-dashboard-settings-trigger="true"
            aria-label="Abrir configurações rápidas da conta"
            aria-expanded={settingsOpen}
            aria-controls="quick-settings"
            aria-haspopup="dialog"
            onClick={() => {
              setOpen(false);
              setSettingsOpen((value) => !value);
            }}
            data-liquid-glow="primary-action"
            className="liquid-glass-control liquid-glass-control--tinted grid size-11 place-items-center rounded-full text-white shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-200 hover:shadow-[0_0_28px_rgba(139,92,246,0.26)] active:scale-95 motion-reduce:transition-none md:flex md:w-auto md:gap-2 md:px-4"
          >
            <Settings size={17} />
            <span className="hidden text-[13px] font-semibold md:inline">Conta</span>
          </button>
        </div>
      </div>

      <p className="max-w-[48rem] text-[13px] font-medium leading-relaxed text-od-text-2 md:text-sm">
        {greeting.message}
      </p>

      <Link
        href="/painel/assistente"
        data-liquid-glow="tim-action"
        className="liquid-glass-control group flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-[13px] font-semibold text-od-text-2 shadow-[0_0_20px_rgba(139,92,246,0.12)] transition-shadow duration-300 hover:text-od-text hover:shadow-[0_0_28px_rgba(139,92,246,0.2)] motion-reduce:transition-none md:inline-flex md:w-auto md:max-w-full md:text-sm"
      >
        <Sparkles size={16} className="shrink-0 text-violet-300" />
        <span className="min-w-0 flex-1 truncate">Acione o Tim na sua operação</span>
        <ArrowRight size={15} className="shrink-0 text-od-text-3 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Link>

      <AnimatePresence initial={false}>
        {settingsOpen ? (
          <motion.div
            id="quick-settings"
            role="dialog"
            aria-modal="false"
            aria-label="Configurações rápidas da conta"
            data-dashboard-quick-settings="true"
            className="glass absolute right-0 top-14 z-[var(--z-dropdown)] w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-3xl p-2 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.86)]"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 px-3 pb-2 pt-2">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-500/75 text-[11px] font-bold text-white"
              >
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-od-text">{displayName}</p>
                <p className="mt-0.5 text-[11px] text-od-text-3">Conta e avisos</p>
              </div>
            </div>

            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-od-text-3">
              Avisos
            </p>

            {/* Cada linha envia as três preferências: a ação grava o conjunto
                inteiro, então mandar só a alterada desligaria as outras. As
                que não estão sendo trocadas seguem em campo escondido. */}
            <NotificationToggle
              field="daily_summary_email"
              label="Resumo diário por e-mail"
              enabled={notificationPreferences.dailySummaryEmail}
              preferences={notificationPreferences}
            />
            <NotificationToggle
              field="stalled_deal_email"
              label="Aviso de negócio parado"
              enabled={notificationPreferences.stalledDealEmail}
              preferences={notificationPreferences}
            />

            <div className="mt-1 border-t border-od-border pt-1">
              <Link
                href="/painel/configuracoes"
                onClick={() => setSettingsOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-od-text-2 transition-colors hover:bg-white/[0.055] hover:text-od-text"
              >
                <Settings size={16} className="shrink-0 text-violet-300" />
                <span className="min-w-0 flex-1 text-xs font-medium">Configurações da conta</span>
              </Link>
              <Link
                href="/painel/equipe"
                onClick={() => setSettingsOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-od-text-2 transition-colors hover:bg-white/[0.055] hover:text-od-text"
              >
                <Users size={16} className="shrink-0 text-violet-300" />
                <span className="min-w-0 flex-1 text-xs font-medium">Equipe</span>
              </Link>
              <form action={logout}>
                <PendingButton
                  className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-od-text-2 transition-colors hover:bg-white/[0.055] hover:text-od-text"
                  pendingLabel="Saindo"
                >
                  <LogOut size={16} className="shrink-0 text-od-text-3" />
                  <span className="min-w-0 flex-1 text-xs font-medium">Sair</span>
                </PendingButton>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="operation-summary"
            role="dialog"
            aria-modal="false"
            aria-label="Resumo da operação"
            data-dashboard-operation-summary="true"
            className="glass absolute right-0 top-14 z-[var(--z-dropdown)] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-3xl p-2 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.86)]"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-3 pb-2 pt-2">
              <p className="text-xs font-semibold text-od-text">Agora na operação</p>
              <p className="mt-1 text-[11px] leading-relaxed text-od-text-3">
                {attentionCount > 0
                  ? `${attentionCount} ${attentionCount === 1 ? "prioridade pede" : "prioridades pedem"} atenção.`
                  : "Nenhuma pendência precisa da sua atenção agora."}
              </p>
            </div>

            {attentionItems.length > 0 ? (
              <div className="space-y-1">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-od-text-2 transition-colors hover:bg-white/[0.055] hover:text-od-text"
                    >
                      <Icon size={16} className={item.danger ? "text-rose-300" : "text-violet-300"} />
                      <span className="min-w-0 flex-1 text-xs font-medium">{item.label}</span>
                      <span className={item.danger ? "text-xs font-bold tabular-nums text-rose-300" : "text-xs font-bold tabular-nums text-od-text"}>
                        {item.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-white/[0.035] px-3">
                <CheckCircle2 size={17} className="shrink-0 text-emerald-300" />
                <div>
                  <p className="text-xs font-semibold text-od-text">Tudo em ordem</p>
                  <p className="mt-0.5 text-[11px] text-od-text-3">A operação não tem itens pendentes.</p>
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
