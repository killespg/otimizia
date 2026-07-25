import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/hero";
import { LogoMarquee } from "@/components/landing/logo-marquee";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { SpotlightCard } from "@/components/landing/spotlight-card";
import { AiComposer } from "@/components/landing/ai-composer";
import { Dock } from "@/components/landing/dock";
import { ContainerScroll } from "@/components/landing/container-scroll-animation";
import { MouseSpotlight } from "@/components/landing/mouse-spotlight";

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
  eyebrow,
  title,
  description,
  raised = false,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  raised?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-16 border-t border-od-border ${raised ? "bg-od-muted-surface" : "bg-od-bg"}`}
    >
      <div className="mx-auto max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] px-8 py-20 md:py-24">
        <div className="mx-auto mb-12 max-w-[560px] text-center">
          <p className="text-od-label text-od-text-3">{eyebrow}</p>
          <h2 className="mt-3 text-od-title text-od-text">{title}</h2>
          {description ? (
            <p className="mt-3 text-[15px] leading-relaxed text-od-text-2">{description}</p>
          ) : null}
        </div>
        {children}
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
      <MouseSpotlight />

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
        <div className="mx-auto max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] px-8 pt-10">
          <Hero animated />
          <div className="-mt-4 pb-20 pt-14">
            <p className="mb-7 text-center text-od-label text-od-text-3">
              Feito para quem vende sozinho — ou em times pequenos
            </p>
            <LogoMarquee bare fadeColor="var(--od-bg)" />
          </div>
        </div>

        <Section
          id="recursos"
          eyebrow="Recursos"
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
                <p className="mx-auto mt-5 max-w-[440px] text-[13px] leading-relaxed text-od-text-2">
                  O exemplo abaixo é navegável: clique nos itens do menu para trocar de tela,
                  e no <strong className="font-semibold text-od-text">nome do negócio</strong>, no topo
                  da barra lateral, para ver o painel de outra profissão.
                </p>
              </>
            }
          >
            <div className="h-full w-full overflow-auto rounded-2xl bg-od-bg p-4">
              <DashboardPreview />
            </div>
          </ContainerScroll>
        </section>

        <Section
          id="ia"
          eyebrow="Sócio-assistente"
          title="Seu sócio que nunca dorme"
          description="A IA que resume o dia, aponta quem chamar primeiro e sugere o próximo passo."
          raised
        >
          <div className="flex flex-col gap-3">
            <SpotlightCard localSpotlight={false} />
            <AiComposer />
          </div>
        </Section>

        <Section
          eyebrow="Atalhos"
          title="Ações rápidas, um clique de distância"
          description="Dashboard, contatos, funil e lembretes — sempre à mão, sem precisar navegar por menus."
        >
          <div className="text-center">
            <Dock className="bg-transparent p-0" />
          </div>
        </Section>

        <section className="border-t border-od-border bg-od-muted-surface">
          <div className="mx-auto max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] px-8 py-24 text-center">
            <h2 className="mx-auto mb-4 max-w-[520px] text-od-title text-od-text">
              Pronto pra parar de perder negócio por esquecimento?
            </h2>
            <p className="mx-auto mb-8 max-w-[440px] text-[15px] text-od-text-2">
              Comece grátis hoje — sem cartão de crédito, sem complicação.
            </p>
            <Link href="/signup" className="btn inline-flex items-center gap-2">
              Começar grátis
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </section>

        <footer className="border-t border-od-border bg-od-bg">
          <div className="mx-auto flex max-w-[1180px] min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px] flex-col items-center gap-2 px-8 py-12 text-sm text-od-text-3">
            <span className="font-bold text-od-text">OtimizIA</span>
            <span>© {new Date().getFullYear()} OtimizIA. Todos os direitos reservados.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
