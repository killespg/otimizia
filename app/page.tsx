import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { DashboardScreenshot } from "@/components/landing/dashboard-screenshot";
import { Pricing } from "@/components/landing/pricing";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { CookiePreferencesLink } from "@/components/site/CookieConsent";
import { AiComposer } from "@/components/landing/ai-composer";
import { ContainerScroll } from "@/components/landing/container-scroll-animation";
import { About } from "@/components/landing/about";
import { LogoWordmark } from "@/components/design-system/logo";
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta";

function Section({
  id,
  title,
  description,
  chapter,
  children,
}: {
  id?: string;
  title?: string;
  description?: string;
  chapter?: "today" | "tim" | "business" | "conversion";
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-landing-chapter={chapter}
      className="lp-section landing-cinematic-section relative scroll-mt-[calc(5rem+env(safe-area-inset-top))]"
    >
      <div className="lp-shell">
        {title || description ? (
          <div className="mx-auto mb-[clamp(36px,4vw,56px)] max-w-[650px] text-center">
            {title ? <h2 className="lp-h2 text-od-text">{title}</h2> : null}
            {description ? <p className="lp-lead mt-4">{description}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "Preciso de cartão de crédito para começar?",
    a: "Não. Você cria a conta, escolhe sua profissão e entra no painel na hora. O cartão só entra se você decidir assinar depois do teste.",
  },
  {
    q: "Serve para a minha profissão?",
    a: "Hoje o OtimizIA tem painel próprio para vendedor autônomo, escritório de advocacia e corretor de imóveis. Cada um vem com as telas e os termos daquele trabalho: carteira e visitas no imobiliário, prazos e processos no jurídico, funil e pedidos nas vendas.",
  },
  {
    q: "Como funciona o WhatsApp?",
    a: "Você conecta seu número e passa a responder de dentro do painel. A conversa fica ligada ao contato e à negociação, com o histórico importado, e dá para deixar a IA responder quando você não puder.",
  },
  {
    q: "Consigo usar no celular?",
    a: "Sim. O OtimizIA é instalável direto do navegador, funciona como aplicativo e manda notificação antes dos seus compromissos. Foi pensado para quem usa em trânsito, entre um atendimento e outro.",
  },
  {
    q: "Como funciona com a minha equipe?",
    a: "Você convida sócios e assistentes com cargos diferentes, controlando quem vê o financeiro, quem gerencia casos e quem só registra atendimento. Se hoje você trabalha sozinho, o painel já vem pronto para uma pessoa e a equipe entra quando você precisar.",
  },
  {
    q: "E se eu quiser cancelar?",
    a: "Cancela quando quiser, sem multa nem fidelidade. Seus dados continuam seus, e você pode exportá-los nas configurações da conta.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/painel");

  return (
    <div data-landing-cinematic="true" className="landing-page landing-cinematic-page dark relative isolate">
      <div aria-hidden className="landing-cinematic-light landing-cinematic-light--blue" />
      <div aria-hidden className="landing-cinematic-light landing-cinematic-light--purple" />

      <LandingNav />
      <MobileStickyCta />

      <main className="relative z-[1]">
        <Hero />

        <section
          id="painel"
          data-landing-chapter="today"
          className="lp-section landing-cinematic-section scroll-mt-[calc(5rem+env(safe-area-inset-top))]"
        >
          <ContainerScroll
            titleComponent={
              <>
                <p className="landing-cinematic-kicker mb-5">Hoje</p>
                <h2 className="lp-h2 text-od-text">
                  Um painel só, <span className="text-od-accent-hover">sem planilha escondida.</span>
                </h2>
                <p className="lp-lead mx-auto mt-4 max-w-[54ch]">
                  Veja o que exige atenção, entre na tela certa e troque de profissão pelo
                  nome do negócio dentro do painel.
                </p>
              </>
            }
          >
            <DashboardScreenshot />
          </ContainerScroll>
        </section>

        <Section
          id="ia"
          chapter="tim"
          title="O próximo passo já pode estar feito."
          description="O Tim não devolve conselho: cria o contato, abre a negociação e agenda o compromisso, por voz ou por escrito."
        >
          <AiComposer />
        </Section>

        <Section
          id="recursos"
          chapter="business"
          title="O que muda de profissão pra profissão"
          description="O núcleo é o mesmo. A rotina, os termos e as ferramentas ao redor são feitos para o seu trabalho."
        >
          <FeatureTabs />
        </Section>

        <Section
          id="planos"
          chapter="conversion"
          title="Um preço, tudo incluso"
          description="Sem módulo pago à parte: a profissão que você escolhe já vem completa."
        >
          <Pricing />
        </Section>

        <Section id="duvidas" title="Perguntas frequentes">
          <div className="mx-auto max-w-[760px]">
            <FaqAccordion items={FAQ} />
          </div>
        </Section>

        <Section id="sobre">
          <About />
        </Section>

        <section id="cta-final" className="lp-section landing-cinematic-section">
          <div className="lp-shell">
            <div
              data-landing-stage="conversion"
              className="landing-cinematic-stage landing-cinematic-final-cta text-center"
            >
              <p className="landing-cinematic-kicker">Seu próximo negócio</p>
              <h2 className="lp-h2 mx-auto mt-5 max-w-[20ch] text-od-text">
                Pronto para parar de perder negócio por esquecimento?
              </h2>
              <p className="lp-lead mx-auto mt-4 max-w-[44ch]">
                Comece grátis hoje, sem cartão de crédito e sem complicação.
              </p>
              <Link href="/signup" className="btn mt-8">
                Começar grátis
                <ArrowRight className="size-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </section>

        <footer className="lp-section-tight landing-cinematic-footer">
          <div className="lp-shell">
            <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <div className="max-w-[320px]">
                <LogoWordmark height={24} />
                <p className="mt-3 text-[13px] leading-relaxed text-od-text-2">
                  CRM para quem trabalha sozinho ou com equipe, com o painel da sua profissão.
                </p>
              </div>
              <div className="grid gap-x-10 gap-y-8 min-[560px]:grid-cols-3">
                <div>
                  <p className="text-od-label text-od-text-3">Produto</p>
                  <ul className="mt-2 text-[13px]">
                    <li><Link href="#painel" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">O painel</Link></li>
                    <li><Link href="#ia" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Sócio-assistente</Link></li>
                    <li><Link href="#recursos" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Profissões</Link></li>
                    <li><Link href="#planos" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Planos</Link></li>
                  </ul>
                </div>
                <div>
                  <p className="text-od-label text-od-text-3">Conta</p>
                  <ul className="mt-2 text-[13px]">
                    <li><Link href="/login" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Entrar</Link></li>
                    <li><Link href="/signup" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Criar conta</Link></li>
                    <li><Link href="/termos" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Termos de uso</Link></li>
                    <li><Link href="/privacidade" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Privacidade</Link></li>
                    <li><CookiePreferencesLink className="inline-flex min-w-11 items-center py-3 text-left text-od-text-2 hover:text-od-text" /></li>
                  </ul>
                </div>
                <div>
                  <p className="text-od-label text-od-text-3">Atendimento</p>
                  <ul className="mt-2 text-[13px]">
                    <li><a href="mailto:venancio@useotimizia.com" className="inline-flex min-w-11 items-center break-all py-3 text-od-text-2 hover:text-od-text">venancio@useotimizia.com</a></li>
                    <li><Link href="#duvidas" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Perguntas frequentes</Link></li>
                    <li><Link href="#sobre" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Sobre nós</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="mt-10 border-t border-od-border pt-6 text-[12px] text-od-text-3">
              © {new Date().getFullYear()} OtimizIA. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
