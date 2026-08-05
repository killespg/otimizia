import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { AnimatedShapesBackground } from "@/components/design-system/animated-shapes-background";
import Globe3D from "@/components/ui/hero";
import { DashboardPreview } from "@/components/landing/dashboard-preview";

/**
 * A estrutura orbital vem do bloco integrado em `components/ui/hero`, enquanto
 * copy, ações e demonstração continuam pertencendo ao registro da landing.
 */
export function Hero({ animated = false }: { animated?: boolean }) {
  return (
    <Globe3D
      eyebrow="CRM com WhatsApp e IA"
      title={
        <>
          <span className="text-od-text">A IA atende seu WhatsApp. </span>
          <span className="text-od-accent-hover">Você entra quando importa.</span>
        </>
      }
      description="Ela responde na hora, percebe quem está pronto pra fechar e abre a negociação no seu funil sozinha. Você assume a conversa quando quiser e liga ou desliga a IA em cada uma."
      primaryAction={
        <Link
          id="hero-cta"
          href="/signup"
          className="liquid-glass-control liquid-glass-control--tinted inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-[0_16px_42px_-24px_rgba(135,87,240,0.9)] sm:w-auto"
        >
          Começar grátis
          <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
      }
      secondaryAction={
        <a
          href="#recursos"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-od-text-2 transition-colors hover:text-od-text sm:w-auto"
        >
          Ver como funciona
          <ArrowDown className="size-4" strokeWidth={1.75} />
        </a>
      }
      visual={<DashboardPreview />}
      ambient={animated ? <AnimatedShapesBackground className="hidden opacity-70 md:block" /> : null}
    />
  );
}
