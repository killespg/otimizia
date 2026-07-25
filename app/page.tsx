import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/hero";
import { LogoMarquee } from "@/components/landing/logo-marquee";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { SpotlightCard } from "@/components/landing/spotlight-card";
import { AiComposer } from "@/components/landing/ai-composer";
import { Dock } from "@/components/landing/dock";
import { ContainerScroll } from "@/components/landing/container-scroll-animation";
import { MouseSpotlight } from "@/components/landing/mouse-spotlight";

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-[560px] text-center">
      <h2 className="text-od-title text-od-text">{title}</h2>
      {description ? (
        <p className="mt-2 text-[15px] leading-relaxed text-od-text-2">{description}</p>
      ) : null}
    </div>
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
    <div className="dark relative overflow-hidden bg-od-bg">
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

      <div className="sticky top-4 z-50 px-4">
      </div>

      <main className="mx-auto max-w-[1180px] px-8 pb-[120px] pt-10">
        <Hero animated />

        {/* Logos soltos direto no fundo da página, sem card próprio — continuação
            visual do hero em vez de um bloco novo. */}
        <div className="-mt-4 pb-20 pt-14">
          <p className="mb-7 text-center text-od-label text-od-text-3">
            Feito para quem vende sozinho — ou em times pequenos
          </p>
          <LogoMarquee bare fadeColor="var(--od-bg)" />
        </div>

        {/* Produto: features seguidas do preview do painel, que "destrava" com
            rotação/escala conforme o visitante rola — o momento de destaque
            da página, por isso é a única seção com respiro de scroll próprio. */}
        <section className="pb-4">
          <SectionHeading
            title="Tudo que você precisa pra não perder negócio"
            description="Contatos, vendas e lembretes numa tela simples — você vê a prioridade e age."
          />
          <FeatureGrid />
        </section>

        <ContainerScroll
          titleComponent={
            <>
              <p className="mb-3 text-od-label text-od-text-3">Veja o painel</p>
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

        {/* IA: spotlight e composer emendados, contando a mesma história em sequência. */}
        <section className="pb-20">
          <SectionHeading
            title="Seu sócio que nunca dorme"
            description="A IA que resume o dia, aponta quem chamar primeiro e sugere o próximo passo."
          />
          <div className="flex flex-col gap-3">
            <SpotlightCard localSpotlight={false} />
            <AiComposer />
          </div>
        </section>

        <section className="pb-24 text-center">
          <SectionHeading
            title="Ações rápidas, um clique de distância"
            description="Dashboard, contatos, funil e lembretes — sempre à mão, sem precisar navegar por menus."
          />
          <Dock className="bg-transparent p-0" />
        </section>

        <section className="pb-20 text-center">
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
        </section>

        <footer className="flex flex-col items-center gap-2 border-t border-od-border pt-10 text-sm text-od-text-3">
          <span className="font-bold text-od-text">OtimizIA</span>
          <span>© {new Date().getFullYear()} OtimizIA. Todos os direitos reservados.</span>
        </footer>
      </main>
    </div>
  );
}
