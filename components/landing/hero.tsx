import Link from "next/link";
import { ArrowRight, CalendarClock, MessageCircleReply, TrendingUp } from "lucide-react";
import { CinematicScrollCorridor } from "@/components/landing/cinematic-scroll-corridor";

const PLATES = [
  {
    id: "today",
    eyebrow: "Hoje",
    title: "A atenção certa, na hora certa.",
    copy: "Clientes atrasados, compromissos e quem precisa de resposta agora.",
    icon: CalendarClock,
  },
  {
    id: "tim",
    eyebrow: "Tim",
    title: "O próximo passo já pode estar feito.",
    copy: "Cria o contato, abre a negociação e agenda o próximo passo.",
    icon: MessageCircleReply,
  },
  {
    id: "business",
    eyebrow: "Negócios",
    title: "O contexto acompanha a venda.",
    copy: "WhatsApp, funil e histórico continuam ligados até o fechamento.",
    icon: TrendingUp,
  },
] as const;

export function Hero() {
  return (
    <section className="landing-cinematic-hero">
      <div className="lp-shell landing-cinematic-hero-grid">
        <div className="landing-cinematic-hero-copy">
          <p className="landing-cinematic-kicker">CRM com WhatsApp e IA para quem vende</p>

          <h1 className="lp-h1 mt-6 max-w-[13ch]">
            Seu negócio não para. <span>Você também não.</span>
          </h1>

          <p className="lp-lead mt-6 max-w-[55ch]">
            O OtimizIA mostra o que precisa da sua atenção, executa o próximo
            passo com o Tim e mantém cada negócio em movimento.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a id="hero-cta" href="/signup" className="btn w-full sm:w-auto">
              Começar grátis
              <ArrowRight className="size-4" strokeWidth={2} />
            </a>
            <Link href="#painel" className="btn-secondary w-full sm:w-auto">
              Ver o painel por dentro
            </Link>
          </div>

          <p className="mt-4 text-[13px] text-od-text-3">
            Sem cartão de crédito. Sua conta entra no painel na hora.
          </p>
        </div>

        <CinematicScrollCorridor>
          <div className="landing-cinematic-plates" aria-label="O OtimizIA em três momentos">
            {PLATES.map(({ id, eyebrow, title, copy, icon: Icon }) => (
              <article
                key={id}
                data-cinematic-plate={id}
                className={`landing-cinematic-plate landing-cinematic-plate--${id}`}
              >
                <div className="landing-cinematic-plate-icon" aria-hidden="true">
                  <Icon className="size-5" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="landing-cinematic-plate-label">{eyebrow}</p>
                  <h2>{title}</h2>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </CinematicScrollCorridor>
      </div>
    </section>
  );
}
