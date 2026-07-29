import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/hero";
import { LogoMarquee } from "@/components/landing/logo-marquee";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { Pricing } from "@/components/landing/pricing";
import { Glow, Reveal } from "@/components/landing/reveal";
import { FaqAccordion } from "@/components/FaqAccordion";
import { CookiePreferencesLink } from "@/components/CookieConsent";
import { SpotlightCard } from "@/components/landing/spotlight-card";
import { AiComposer } from "@/components/landing/ai-composer";
import { ContainerScroll } from "@/components/landing/container-scroll-animation";
import { About } from "@/components/landing/about";
import { LogoWordmark } from "@/components/design-system/logo";

/**
 * Faixa de seção de largura total.
 *
 * A landing era um `main` único com as seções separadas só por padding-bottom
 * variável — sem régua, sem topo, sem mudança de fundo. Lia como um bloco só.
 * Agora cada categoria ocupa uma faixa, com rótulo próprio, ritmo igual e
 * superfície alternada: a divisão aparece antes de o visitante ler.
 */
function Section({
  id,
  title,
  description,
  raised = false,
  children,
}: {
  id?: string;
  /** Opcional: seções cujo próprio conteúdo abre com um título maior passam
   *  sem ele, para não empilhar um h2 pequeno em cima de uma frase grande. */
  title?: string;
  description?: string;
  raised?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative isolate scroll-mt-16 overflow-hidden border-t border-od-border ${raised ? "bg-od-muted-surface" : "bg-od-bg"}`}
    >
      <Glow className="-top-40 left-1/2 -translate-x-1/2" size={640} intensity={0.1} pulse />
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
  // Antes daqui existia so o redirect, e a landing nunca chegou a ser
  // reconstruida no headless — a origem dela e o catalogo do design system.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/painel");

  return (
    <div className="dark relative bg-od-bg">

      {/* Glow de fundo único, atravessando hero → features → dashboard, pra costurar
          as seções em vez de cada uma "recomeçar" visualmente do zero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1400px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(92,34,232,0.22), transparent 65%)",
        }}
      />

      <LandingNav />
      <main className="relative overflow-hidden">
        {/* Abertura: hero e prova social continuam emendados, sem regua entre
            eles — sao um bloco de entrada, nao duas categorias. */}
        <div className="mx-auto max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] px-5 pt-10 sm:px-8">
          <Hero animated />
          <div className="-mt-4 pb-20 pt-14">
            <p className="mb-7 text-center text-od-label text-od-text-3">
              Feito para quem trabalha sozinho e para equipes inteiras
            </p>
            <LogoMarquee bare fadeColor="var(--od-bg)" />
          </div>
        </div>

        <Section
          id="recursos"
          title="O que muda de profissão pra profissão"
          description="O núcleo é o mesmo; o que está em volta é feito pro seu trabalho. Escolha a sua."
          raised
        >
          <FeatureTabs />
        </Section>

        <section id="painel" className="scroll-mt-16 border-t border-od-border bg-od-bg">
          <ContainerScroll
            titleComponent={
              <>
                <p className="mb-3 text-od-label text-od-text-3">O painel</p>
                <h2 className="text-4xl font-extrabold leading-none tracking-tight text-od-text md:text-6xl">
                  Um painel só,
                  <br />
                  <span className="text-od-accent">sem planilha escondida.</span>
                </h2>
                {/* A instrucao fica aqui fora: dentro do card, o bloco da
                    organizacao e o WorkspaceSwitcher do produto, e destaca-lo
                    quebraria a fidelidade da sidebar. */}
                <p className="mx-auto mt-5 max-w-[440px] pb-10 text-[13px] leading-relaxed text-od-text-2">
                  O exemplo abaixo é navegável: use os controles para trocar de tela e o{" "}
                  <strong className="font-semibold text-od-text">nome do negócio</strong> para
                  conhecer o painel de outra profissão.
                </p>
              </>
            }
          >
            <div className="h-full w-full overflow-auto rounded bg-od-bg p-2 sm:p-4">
              <DashboardPreview />
            </div>
          </ContainerScroll>
        </section>

        <Section
          id="ia"
          title="Tim, o sócio que nunca dorme"
          description="Ele não devolve conselho: cria o contato, abre a negociação e agenda o compromisso, por voz ou por escrito."
          raised
        >
          <div className="flex flex-col gap-3">
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
          raised
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

        <section className="border-t border-od-border bg-od-muted-surface">
          <div className="mx-auto max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] px-5 py-24 text-center sm:px-8">
            <h2 className="mx-auto mb-4 max-w-[520px] text-od-title text-od-text">
              Pronto pra parar de perder negócio por esquecimento?
            </h2>
            <p className="mx-auto mb-8 max-w-[440px] text-[15px] text-od-text-2">
              Comece grátis hoje, sem cartão de crédito e sem complicação.
            </p>
            <Link href="/signup" className="btn inline-flex items-center gap-2">
              Começar grátis
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </section>

        <footer className="border-t border-od-border bg-od-bg">
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
