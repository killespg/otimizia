import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/hero";
import { LogoMarquee } from "@/components/landing/logo-marquee";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { Pricing } from "@/components/landing/pricing";
import { Reveal } from "@/components/landing/reveal";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { CookiePreferencesLink } from "@/components/site/CookieConsent";
import { SpotlightCard } from "@/components/landing/spotlight-card";
import { AiComposer } from "@/components/landing/ai-composer";
import { About } from "@/components/landing/about";
import { LogoWordmark } from "@/components/design-system/logo";
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta";

/**
 * Capítulo editorial da landing.
 *
 * O canvas é contínuo. Cada capítulo ganha ritmo por espaço e iluminação,
 * enquanto somente os módulos interativos recebem volumes Liquid Glass.
 */
function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  /** Opcional: seções cujo próprio conteúdo abre com um título maior passam
   *  sem ele, para não empilhar um h2 pequeno em cima de uma frase grande. */
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="landing-liquid-section relative isolate scroll-mt-16 overflow-hidden"
    >
      <div className="mx-auto max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] px-5 py-20 sm:px-8 md:py-24">
        {title || description ? (
          <Reveal className="mx-auto mb-12 max-w-[560px] text-center">
            {title ? <h2 className="text-od-title text-od-text">{title}</h2> : null}
            {description ? (
              <p className="mt-3 text-[15px] leading-relaxed text-od-text-2">{description}</p>
            ) : null}
          </Reveal>
        ) : null}
        <Reveal delay={0.08}>{children}</Reveal>
      </div>
    </section>
  );
}

export default async function LandingPage() {
  // Quem ja tem sessao nao precisa da pagina de venda: vai direto pro produto.
  // A landing veio do catalogo do design system, nao do frontend anterior.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/painel");

  return (
    <div
      data-landing-liquid-canvas="true"
      className="landing-page landing-liquid-page dark relative min-h-screen overflow-hidden"
    >
      <LandingNav />
      <MobileStickyCta />
      <main className="relative z-[1] overflow-hidden">
        {/* Abertura: hero e prova social continuam emendados, sem regua entre
            eles — sao um bloco de entrada, nao duas categorias. */}
        <div className="mx-auto max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] px-5 pt-10 sm:px-8">
          <Hero animated />
          <div
            data-landing-glass-stage="true"
            className="landing-liquid-stage landing-liquid-stage--soft -mt-4 mb-20 px-4 py-8 sm:px-8"
          >
            <p className="mb-7 text-center text-od-label text-od-text-3">
              Feito para quem trabalha sozinho e para equipes inteiras
            </p>
            <LogoMarquee bare fadeColor="rgba(14, 12, 20, 0.01)" />
          </div>
        </div>

        <Section
          id="recursos"
          title="O que muda de profissão pra profissão"
          description="O núcleo é o mesmo; o que está em volta é feito pro seu trabalho. Escolha a sua."
        >
          <FeatureTabs />
        </Section>

        <Section
          id="ia"
          title="Tim, o sócio que nunca dorme"
          description="Ele não devolve conselho: cria o contato, abre a negociação e agenda o compromisso, por voz ou por escrito."
        >
          <div
            data-landing-glass-stage="true"
            data-landing-tim-stage="true"
            className="landing-liquid-stage flex flex-col gap-3 p-5 sm:p-7"
          >
            <SpotlightCard localSpotlight={false} />
            <AiComposer />
          </div>
        </Section>

        <Section
          id="planos"
          title="Um preço, tudo incluso"
          description="Sem módulo pago à parte: a profissão que você escolhe já vem completa."
        >
          <Pricing />
        </Section>

        <Section
          id="duvidas"
          title="Perguntas frequentes"
        >
          <div className="mx-auto max-w-[760px]">
            <FaqAccordion
              items={[
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
                  a: "Você convida sócios e assistentes com cargos diferentes, controlando quem vê o financeiro, quem gerencia casos e quem só registra atendimento. E se hoje você trabalha sozinho, nada disso atrapalha: o painel já vem pronto para uma pessoa e a equipe entra quando você precisar.",
                },
                {
                  q: "E se eu quiser cancelar?",
                  a: "Cancela quando quiser, sem multa nem fidelidade. Seus dados continuam seus, e você pode exportá-los nas configurações da conta.",
                },
              ]}
            />
          </div>
        </Section>

        <Section
          id="sobre"
        >
          <About />
        </Section>

        <section id="cta-final" className="landing-liquid-section px-5 py-20 sm:px-8 md:py-24">
          <div
            data-landing-glass-stage="true"
            data-landing-final-cta="true"
            className="landing-liquid-stage landing-liquid-final-cta mx-auto max-w-[980px] px-6 py-14 text-center sm:px-10 md:py-16"
          >
            <h2 className="mx-auto mb-4 max-w-[520px] text-od-title text-od-text">
              Pronto pra entrar na nova era do empreendimento?
            </h2>
            <p className="mx-auto mb-8 max-w-[440px] text-[15px] text-od-text-2">
              Comece grátis hoje, sem cartão de crédito e sem complicação.
            </p>
            <Link
              href="/signup"
              className="liquid-glass-control liquid-glass-control--tinted inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white"
            >
              Começar grátis
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </section>

        <footer className="relative border-t border-white/[0.08]">
          <div className="mx-auto max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] px-5 py-12 sm:px-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="max-w-[320px]">
                <LogoWordmark height={24} />
                <p className="mt-3 text-[13px] leading-relaxed text-od-text-2">
                  CRM para quem trabalha sozinho ou com equipe, com o painel da sua profissão.
                </p>
              </div>
              <div className="grid gap-x-8 gap-y-6 min-[560px]:grid-cols-3">
                <div>
                  <p className="text-od-label text-od-text-3">Produto</p>
                  <ul className="mt-3 space-y-2 text-[13px]">
                    <li><Link href="#recursos" className="inline-flex min-h-11 min-w-11 items-center text-od-text-2 hover:text-od-text">Recursos</Link></li>
                    <li><Link href="#painel" className="inline-flex min-h-11 min-w-11 items-center text-od-text-2 hover:text-od-text">O painel</Link></li>
                    <li><Link href="#planos" className="inline-flex min-h-11 min-w-11 items-center text-od-text-2 hover:text-od-text">Planos</Link></li>
                    <li><Link href="#sobre" className="inline-flex min-h-11 min-w-11 items-center text-od-text-2 hover:text-od-text">Sobre nós</Link></li>
                  </ul>
                </div>
                <div>
                  <p className="text-od-label text-od-text-3">Conta</p>
                  <ul className="mt-3 space-y-2 text-[13px]">
                    <li><Link href="/login" className="inline-flex min-h-11 min-w-11 items-center text-od-text-2 hover:text-od-text">Entrar</Link></li>
                    <li><Link href="/signup" className="inline-flex min-h-11 min-w-11 items-center text-od-text-2 hover:text-od-text">Criar conta</Link></li>
                    <li><Link href="/termos" className="inline-flex min-h-11 min-w-11 items-center text-od-text-2 hover:text-od-text">Termos de uso</Link></li>
                    <li><Link href="/privacidade" className="inline-flex min-h-11 min-w-11 items-center text-od-text-2 hover:text-od-text">Privacidade</Link></li>
                    <li>
                      <CookiePreferencesLink className="inline-flex min-h-11 items-center text-left text-od-text-2 hover:text-od-text" />
                    </li>
                  </ul>
                </div>
                {/* SAC como mailto de verdade, não texto solto: no celular, um
                    endereço que não abre o app de e-mail vira copiar e colar. */}
                <div>
                  <p className="text-od-label text-od-text-3">Atendimento</p>
                  <ul className="mt-3 space-y-2 text-[13px]">
                    <li>
                      <a
                        href="mailto:venancio@useotimizia.com"
                        className="inline-flex min-h-11 items-center break-all text-od-text-2 hover:text-od-text"
                      >
                        venancio@useotimizia.com
                      </a>
                    </li>
                    <li><Link href="#duvidas" className="inline-flex min-h-11 items-center text-od-text-2 hover:text-od-text">Perguntas frequentes</Link></li>
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
