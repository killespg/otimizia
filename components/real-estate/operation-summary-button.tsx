"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AnchoredPanel } from "@/components/ui/AnchoredPanel";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  HandCoins,
  type LucideIcon,
} from "lucide-react";

export type OperationSummary = {
  requestedVisits: number;
  openOffers: number;
  overdueCommissions: number;
};

type AttentionItem = {
  count: number;
  href: string;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
};

/**
 * Sino do resumo da operação. Mora na topbar, e não no cabeçalho do painel,
 * porque o que ele mostra — visitas, propostas e comissões pedindo atenção —
 * vale em qualquer tela do corretor, não só na visão geral.
 */
export function OperationSummaryButton({
  requestedVisits,
  openOffers,
  overdueCommissions,
}: OperationSummary) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

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


  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-dashboard-notification-trigger="true"
        aria-label="Ver resumo da operação"
        aria-expanded={open}
        aria-controls="operation-summary"
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-11 place-items-center rounded-lg text-od-text-3 transition-colors hover:bg-white/[0.045] hover:text-od-text"
      >
        <Bell size={17} />
        {attentionCount > 0 ? (
          <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[9px] font-bold leading-none text-white">
            {attentionCount > 9 ? "9+" : attentionCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <AnchoredPanel anchorRef={triggerRef} onClose={() => setOpen(false)}>
          <motion.div
            id="operation-summary"
            role="dialog"
            aria-modal="false"
            aria-label="Resumo da operação"
            data-dashboard-operation-summary="true"
            className="glass w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-3xl p-2 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.86)]"
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
          </AnchoredPanel>
        ) : null}
      </AnimatePresence>
    </>
  );
}
