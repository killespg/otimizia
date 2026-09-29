import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/nav";
import { LandingEffects } from "@/components/landing/effects";
import { StickyCta } from "@/components/landing/sticky-cta";
import { Accent } from "@/components/landing/scene";
import { Professions } from "@/components/landing/professions";
import { PanelPreview } from "@/components/landing/panel-preview";
import { Assistant } from "@/components/landing/assistant";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { About } from "@/components/landing/about";
import { Footer } from "@/components/landing/footer";
import "./landing.css";

/**
 * Site institucional OtimizIA. Identidade própria (app/landing.css, escopada
 * em .oz), independente dos tokens do produto. Só o marcador data-reveal
 * anima a entrada; sem JavaScript o conteúdo inteiro continua visível.
 */
function Section({
  id,
  band = false,
  title,
  description,
  children,
}: {
  id?: string;
  band?: boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`oz-section${band ? " oz-band" : ""}`}>
      <div className="oz-container">
        {title || description ? (
          <div className="oz-head" data-reveal>
            {title ? <h2 className="oz-h2">{title}</h2> : null}
            {description ? <p className="oz-lead">{description}</p> : null}
          </div>
        ) : null}
        <div data-reveal>{children}</div>
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
    a: "Sim. O OtimizIA é instalável direto do navegador, funciona como aplicativo e manda notificação antes dos seus compromissos. Funciona em trânsito, entre um atendimento e outro.",
  },
  {
    q: "Como funciona com a minha equipe?",
    a: "Você convida sócios e assistentes com cargos diferentes, controlando quem vê o financeiro, quem gerencia casos e quem só registra atendimento. E se hoje você trabalha sozinho, nada disso atrapalha: o painel já vem pronto para uma pessoa e a equipe entra quando você precisar.",
  },
  {
    q: "E se eu quiser cancelar?",
    a: "Cancela quando quiser, sem multa nem fidelidade. Seus dados continuam seus, e você pode exportá-los nas configurações da conta.",
  },
];

export default async function LandingPage() {
  // Quem já tem sessão não precisa da página de venda: vai direto pro produto.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/painel");

  return (
    <div className="oz">
      <LandingEffects />
      <LandingNav />
      <StickyCta />
      <main>
        <Hero />

        <section className="oz-section" aria-label="Para quem é" style={{ paddingBlock: "clamp(40px, 6vw, 72px)" }}>
          <div className="oz-container" style={{ textAlign: "center" }} data-reveal>
            <p className="oz-label">Serve para quem trabalha sozinho e para equipe inteira</p>
            <ul className="oz-audience">
              {["Corretor de imóveis", "Escritório de advocacia", "Vendedor autônomo"].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <Section
          id="recursos"
          band
          title="O que muda de profissão pra profissão"
          description="O núcleo é o mesmo; o que está em volta é feito pro seu trabalho. Escolha a sua."
        >
          <Accent side="right" size={620} top="6%" halo="rgba(36, 91, 255, 0.12)" />
          <Professions />
        </Section>

        <Section id="painel">
          <div className="oz-head" style={{ marginBottom: 48 }} data-reveal>
            <p className="oz-eyebrow" style={{ marginBottom: 20 }}>O painel</p>
            <h2 className="oz-h2" style={{ fontSize: "clamp(34px, 5vw, 60px)" }}>
              Um painel só, <br />
              <span style={{ color: "var(--oz-blue-soft)" }}>sem planilha escondida.</span>
            </h2>
            <p className="oz-small" style={{ margin: "20px auto 0", maxWidth: 440 }}>
              O exemplo abaixo é navegável: use as abas para conhecer o painel de outra profissão.
            </p>
          </div>
          <PanelPreview />
        </Section>

        <Section
          id="ia"
          band
          title="Tim, o sócio-assistente"
          description="Ele não devolve conselho: cria o contato, abre a negociação e agenda o compromisso, por voz ou por escrito."
        >
          <Accent side="left" size={560} top="20%" halo="rgba(123, 77, 255, 0.12)" />
          <Assistant />
        </Section>

        <Section
          id="planos"
          title="Um preço, tudo incluso"
          description="Sem módulo pago à parte: a profissão que você escolhe já vem completa."
        >
          <Pricing />
        </Section>

        <Section id="duvidas" band title="Perguntas frequentes">
          <Faq items={FAQ} />
        </Section>

        <Section id="sobre">
          <Accent side="right" size={520} top="8%" halo="rgba(36, 91, 255, 0.1)" />
          <About />
        </Section>

        <section id="cta-final" className="oz-section oz-band oz-cta">
          <Accent side="left" size={640} top="-20%" halo="rgba(73, 55, 255, 0.16)" />
          <div className="oz-container" data-reveal>
            <h2 className="oz-h2">Pronto pra parar de perder negócio por esquecimento?</h2>
            <p className="oz-lead" style={{ margin: "16px auto 32px", maxWidth: 440 }}>
              Comece grátis hoje, sem cartão de crédito.
            </p>
            <Link href="/signup" className="oz-btn" style={{ minHeight: 52 }}>
              Começar grátis
              <ArrowRight size={16} aria-hidden />
            </Link>

            {/* Faixa de fatos verificáveis, não depoimento. Quando houver um
                depoimento real, ele entra aqui; não publicar frase inventada. */}
            <ul className="oz-facts">
              <li>30 dias grátis, sem cartão</li>
              <li>IA atendendo no WhatsApp</li>
              <li>Exporta seus dados quando quiser</li>
              <li>Cancele sem multa</li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
