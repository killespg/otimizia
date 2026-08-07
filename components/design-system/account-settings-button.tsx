"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AnchoredPanel } from "@/components/ui/AnchoredPanel";
import { UserAvatar } from "@/components/design-system/user-avatar";
import { LogOut, Settings, Users } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { logout } from "@/app/(auth)/actions";
import { updateNotificationPreferences } from "@/app/(dashboard)/painel/configuracoes/notifications-actions";

export type NotificationPreferences = {
  dailyPush: boolean;
  dailySummaryEmail: boolean;
  stalledDealEmail: boolean;
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
 * como "on" ou ausente. Enviar só o campo alterado desligaria os outros dois —
 * por isso o formulário carrega os demais em campo escondido, com o valor
 * atual.
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

/**
 * Identidade e configurações rápidas. Fica na topbar porque conta, avisos e
 * saída são caminhos de qualquer tela — o cabeçalho do painel só existe na
 * visão geral.
 *
 * Nasceu dentro de `components/real-estate/` e ficou lá por engano: nada aqui é
 * imobiliário. Nome, avisos por e-mail, Configurações, Equipe e Sair valem em
 * qualquer vertical, e nas outras três a topbar tinha só um link seco para
 * /painel/configuracoes. Mudou de pasta e de nome em 2026-08-07, quando passou
 * a ser usado pelas quatro.
 */
export function AccountSettingsButton({
  displayName,
  avatarUrl,
  notificationPreferences,
}: {
  displayName: string;
  avatarUrl: string | null;
  notificationPreferences: NotificationPreferences;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-dashboard-settings-trigger="true"
        aria-label="Abrir configurações rápidas da conta"
        aria-expanded={open}
        aria-controls="quick-settings"
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full transition-colors hover:brightness-110"
      >
        <UserAvatar
          name={displayName}
          photoUrl={avatarUrl}
          className="size-11 bg-white/[0.07] text-xs font-bold text-od-text-2"
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <AnchoredPanel anchorRef={triggerRef} onClose={() => setOpen(false)}>
          <motion.div
            id="quick-settings"
            role="dialog"
            aria-modal="false"
            aria-label="Configurações rápidas da conta"
            data-dashboard-quick-settings="true"
            className="glass w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-3xl p-2 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.86)]"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 px-3 pb-2 pt-2">
              <UserAvatar
                name={displayName}
                photoUrl={avatarUrl}
                className="size-9 bg-violet-500/75 text-[11px] font-bold text-white"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-od-text">{displayName}</p>
                <p className="mt-0.5 text-[11px] text-od-text-3">Conta e avisos</p>
              </div>
            </div>

            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-od-text-3">
              Avisos
            </p>

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
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-od-text-2 transition-colors hover:bg-white/[0.055] hover:text-od-text"
              >
                <Settings size={16} className="shrink-0 text-violet-300" />
                <span className="min-w-0 flex-1 text-xs font-medium">Configurações da conta</span>
              </Link>
              <Link
                href="/painel/equipe"
                onClick={() => setOpen(false)}
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
          </AnchoredPanel>
        ) : null}
      </AnimatePresence>
    </>
  );
}
