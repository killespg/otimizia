import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MobileDashboardGreeting } from "@/lib/real-estate/mobile-dashboard-greeting";
import { TimIcon } from "@/components/design-system/tim-icon";

export type RealEstateDashboardHeaderProps = {
  displayName: string;
  activePropertyCount: number;
  greeting: Pick<MobileDashboardGreeting, "salutation" | "message">;
};

function displayIdentity(displayName: string) {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Corretor";
  const initials = `${nameParts[0]?.[0] ?? "C"}${nameParts.length > 1 ? nameParts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();

  return { firstName, initials };
}

/**
 * Cabeçalho da visão geral: quem está usando, como está a carteira e a entrada
 * para o Tim.
 *
 * O sino do resumo e as configurações rápidas moraram aqui por um tempo e
 * subiram para a topbar — os dois valem em qualquer tela do corretor, e aqui
 * apareciam ao lado dos equivalentes da topbar, repetindo o mesmo destino.
 * Sem estado próprio, o componente voltou a ser de servidor.
 */
export function RealEstateDashboardHeader({
  displayName,
  activePropertyCount,
  greeting,
}: RealEstateDashboardHeaderProps) {
  const { firstName, initials } = displayIdentity(displayName);

  return (
    <section data-dashboard-profile-header="true" className="relative space-y-3 md:space-y-4">
      <div className="flex min-h-11 w-full items-center gap-3 md:gap-4">
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

      <p className="max-w-[48rem] text-[13px] font-medium leading-relaxed text-od-text-2 md:text-sm">
        {greeting.message}
      </p>

      <Link
        href="/painel/assistente"
        data-liquid-glow="tim-action"
        className="liquid-glass-control group flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-[13px] font-semibold text-od-text-2 shadow-[0_0_20px_rgba(139,92,246,0.12)] transition-shadow duration-300 hover:text-od-text hover:shadow-[0_0_28px_rgba(139,92,246,0.2)] motion-reduce:transition-none md:inline-flex md:w-auto md:max-w-full md:text-sm"
      >
        <TimIcon size={16} className="shrink-0 text-violet-300" />
        <span className="min-w-0 flex-1 truncate">Acione o Tim na sua operação</span>
        <ArrowRight size={15} className="shrink-0 text-od-text-3 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Link>
    </section>
  );
}
