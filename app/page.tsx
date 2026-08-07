import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/hero";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { Pricing } from "@/components/landing/pricing";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { CookiePreferencesLink } from "@/components/site/CookieConsent";
import { AiComposer } from "@/components/landing/ai-composer";
import { ContainerScroll } from "@/components/landing/container-scroll-animation";
import { About } from "@/components/landing/about";
import { LogoWordmark } from "@/components/design-system/logo";
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta";

/**
 * Faixa de seção.
 *
 * Duas mudanças em relação à versão anterior. A primeira é o respiro: ele vem
 * de `.lp-section` e de mais lugar nenhum, porque antes a faixa tinha `py-24`
 * e o componente de dentro ainda punha o seu — e as emendas variavam de 96 px
 * a 300 px sem regra. A segunda é a fronteira: `raised` troca o plano de fundo
 * em vez de desenhar uma régua entre cada duas seções. É o mesmo argumento da
 * regra 4a e do `.od-band` — a separação vem do material.
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
   *  sem ele, para não empilhar dois títulos falando da mesma coisa. */
  title?: string;
  description?: string;
  raised?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`lp-section relative scroll-mt-[calc(4rem+env(safe-area-inset-top))] ${raised ? "bg-od-muted-surface" : ""}`}
    >
      <div className="lp-shell">
        {title || description ? (
          <div className="mx-auto mb-[clamp(36px,4vw,56px)] max-w-[620px] text-center">
            {title ? <h2 className="lp-h2 text-od-text">{title}</h2> : null}
            {description ? <p className="lp-lead mt-4">{description}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export default async function LandingPage() {
  // Quem ja tem sessao nao precisa da pagina de venda: vai direto pro produto.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/painel");

  return (
    <div className="landing-page dark relative isolate bg-od-bg">
      {/* Fonte de luz única da página — ver `.lp-aurora` em globals.css. */}
      <div aria-hidden className="lp-aurora" />

      <LandingNav />
      <MobileStickyCta />
      <main className="relative">
        <Hero animated />

        <Section
          id="recursos"
          title="O que muda de profissão pra profissão"
          description="O núcleo é o mesmo; o que está em volta é feito pro seu trabalho. Escolha a sua."
          raised
        >
          <FeatureTabs />
        </Section>

        <section id="painel" className="lp-section scroll-mt-[calc(4rem+env(safe-area-inset-top))]">
          <ContainerScroll
            titleComponent={
              <>
                <h2 className="lp-h2 text-od-text">
                  Um painel só,{" "}
                  <span className="text-od-accent-hover">sem planilha escondida.</span>
                </h2>
                {/* A instrucao fica aqui fora: dentro do card, o bloco da
                    organizacao e o WorkspaceSwitcher do produto, e destaca-lo
                    quebraria a fidelidade da sidebar. */}
                <p className="lp-lead mx-auto mt-4 max-w-[52ch]">
                  O exemplo abaixo é navegável: use os controles para trocar de tela e o{" "}
                  <strong className="font-semibold text-od-text">nome do negócio</strong> para
                  conhecer o painel de outra profissão.
                </p>
              </>
            }
          >
            <DashboardPreview />
          </ContainerScroll>
        </section>

        {/* Só um bloco do Tim aqui. Ele aparecia três vezes na página — a faixa
            por profissão dentro de "Recursos", um "Tim em ação" com quatro
            exemplos e este composer —, e as três repetiam a MESMA frase
            ("Cadastra a Carla e abre uma negociação"). Os exemplos por
            profissão ficaram em "Recursos", onde mudam de acordo com o
            trabalho; aqui fica a demonstração da conversa, uma vez. */}
        <Section
          id="ia"
          title="Tim, o sócio que nunca dorme"
          description="Ele não devolve conselho: cria o contato, abre a negociação e agenda o compromisso, por voz ou por escrito."
          raised
        >
          <AiComposer />
        </Section>

        <Section
          id="planos"
          title="Um preço, tudo incluso"
          description="Sem módulo pago à parte: a profissão que você escolhe já vem completa."
        >
          <Pricing />
        </Section>

        <Section id="duvidas" title="Perguntas frequentes" raised>
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

        <Section id="sobre">
          <About />
        </Section>

        <section id="cta-final" className="lp-section bg-od-muted-surface">
          <div className="lp-shell text-center">
            <h2 className="lp-h2 mx-auto max-w-[18ch] text-od-text">
              Pronto pra parar de perder negócio por esquecimento?
            </h2>
            <p className="lp-lead mx-auto mt-4 max-w-[44ch]">
              Comece grátis hoje, sem cartão de crédito e sem complicação.
            </p>
            <Link href="/signup" className="btn mt-8">
              Começar grátis
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </section>

        <footer className="lp-section-tight border-t border-od-border">
          <div className="lp-shell">
            <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <div className="max-w-[320px]">
                <LogoWordmark height={24} />
                <p className="mt-3 text-[13px] leading-relaxed text-od-text-2">
                  CRM para quem trabalha sozinho ou com equipe, com o painel da sua profissão.
                </p>
              </div>
              {/* `space-y` curto e alvo de 44px pelo padding do link, não pela
                  altura da linha: com `min-h-11` em cada item, quatro links
                  ocupavam 260 px de coluna e o rodapé virava a terceira maior
                  seção da página. O alvo continua nos 44 px exigidos. */}
              <div className="grid gap-x-10 gap-y-8 min-[560px]:grid-cols-3">
                <div>
                  <p className="text-od-label text-od-text-3">Produto</p>
                  <ul className="mt-2 text-[13px]">
                    <li><Link href="#recursos" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Recursos</Link></li>
                    <li><Link href="#painel" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">O painel</Link></li>
                    <li><Link href="#planos" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Planos</Link></li>
                    <li><Link href="#sobre" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Sobre nós</Link></li>
                  </ul>
                </div>
                <div>
                  <p className="text-od-label text-od-text-3">Conta</p>
                  <ul className="mt-2 text-[13px]">
                    <li><Link href="/login" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Entrar</Link></li>
                    <li><Link href="/signup" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Criar conta</Link></li>
                    <li><Link href="/termos" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Termos de uso</Link></li>
                    <li><Link href="/privacidade" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Privacidade</Link></li>
                    <li>
                      <CookiePreferencesLink className="inline-flex min-w-11 items-center py-3 text-left text-od-text-2 hover:text-od-text" />
                    </li>
                  </ul>
                </div>
                {/* SAC como mailto de verdade, não texto solto: no celular, um
                    endereço que não abre o app de e-mail vira copiar e colar. */}
                <div>
                  <p className="text-od-label text-od-text-3">Atendimento</p>
                  <ul className="mt-2 text-[13px]">
                    <li>
                      <a
                        href="mailto:venancio@useotimizia.com"
                        className="inline-flex min-w-11 items-center break-all py-3 text-od-text-2 hover:text-od-text"
                      >
                        venancio@useotimizia.com
                      </a>
                    </li>
                    <li><Link href="#duvidas" className="inline-flex min-w-11 items-center py-3 text-od-text-2 hover:text-od-text">Perguntas frequentes</Link></li>
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
