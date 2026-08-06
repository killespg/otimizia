import Link from "next/link";
import type { InputHTMLAttributes } from "react";
import { AlertCircle, CalendarCheck2, Check, ContactRound } from "lucide-react";
import { LogoWordmark } from "@/components/design-system/logo";
import { AmbientParticles } from "@/components/design-system/ambient-particles";
import { AnimatedShapesBackground } from "@/components/design-system/animated-shapes-background";
import { TimIcon } from "@/components/design-system/tim-icon";

/**
 * Moldura das telas de entrada.
 *
 * Estava com a paleta antiga cravada em hex (#171320, #1d1924, #120f1c) e com
 * texto e régua em opacidade de branco (white/48, white/[0.07]). Duas
 * consequências: os planos não acompanhavam a escada de superfícies que o
 * resto do produto passou a usar, e qualquer ajuste de tema deixava estas
 * quatro rotas para trás, porque não liam token nenhum.
 *
 * Mapeamento aplicado, seguindo a mesma leitura do painel: a coluna de
 * apresentação é o plano mais fundo (`od-sidebar`), o formulário fica na
 * superfície elevada (`od-surface`) e a página (por trás do card) usa o
 * mesmo par que abre o hero da landing — glow radial + cápsulas animadas
 * (`AnimatedShapesBackground`) — pra puxar a mesma identidade visual.
 *
 * Com o card flutuando sobre esse fundo animado, ele passou a se qualificar
 * pra regra do `shadow-od-float` (sombra em repouso só pra elemento que
 * literalmente flutua sobre o conteúdo). A partir de `sm`, o card ganha uma
 * moldura (`p-3`) e a coluna de apresentação vira um bloco arredondado
 * próprio dentro dela — quadro dentro do quadro — em vez de ir de ponta a
 * ponta como antes.
 */
const AUTH_FEATURES = [
  [ContactRound, "Clientes organizados", "Histórico completo e próximos passos sempre disponíveis."],
  [TimIcon, "Tim, seu assistente de IA", "Responde no WhatsApp e sinaliza o momento certo de agir."],
  [CalendarCheck2, "Lembretes no momento certo", "Você sempre terá noção clara dos seus vencimentos."],
] as const;

export function AuthShell({
  title,
  subtitle,
  error,
  notice,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  error?: string;
  notice?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main
      className="relative h-[100dvh] overflow-hidden bg-od-bg p-2 sm:grid sm:place-items-center sm:p-5"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* O mesmo glow que abre o hero da landing, só que centralizado — aqui
          não há um lado esquerdo fixo pra ancorar o gradiente. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(92,34,232,0.32), transparent 70%)",
        }}
      />
      <AnimatedShapesBackground />
      <div className="relative z-10 mx-auto grid h-full w-full max-w-6xl gap-0 overflow-hidden rounded-[24px] border border-od-border bg-od-surface shadow-od-float sm:h-auto sm:min-h-[min(760px,calc(100dvh-2.5rem))] sm:gap-3 sm:rounded-[28px] sm:p-3 lg:grid-cols-[1.05fr_.95fr]">
        {/* No desktop a cor vem da coluna escura da esquerda (bg-od-sidebar +
            partículas). No mobile essa coluna some (hidden lg:flex) e o card
            virou uma superfície cinza quase de ponta a ponta — sem isso, o
            único roxo da marca ficava espremido nos 8px de margem em volta
            do card, invisível na prática. Esse glow entra por cima da própria
            superfície, cortado pelos cantos arredondados do card. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(ellipse_90%_100%_at_50%_-10%,rgba(135,87,240,0.4),transparent_72%)] lg:hidden"
        />
        {/* A mesma poeira da área autenticada, contida em cada coluna. Densidade
            mais esparsa que no painel: aqui ela preenche o vazio entre o texto
            e a lista, não deve competir com o formulário. */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-od-sidebar p-10 sm:rounded-[20px] lg:flex">
          <AmbientParticles contained density={11000} maxParticles={70} />
          <div className="relative z-10">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-md focus-visible:ring-2 focus-visible:ring-od-accent"
            >
              <LogoWordmark height={32} />
            </Link>
            <h2 className="mt-16 max-w-lg text-[34px] font-extrabold leading-[1.14] tracking-[-0.025em] text-od-text">
              A IA que atende seu WhatsApp e organiza toda a operação do seu negócio.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-od-text-2">
              Cada profissão tem um painel dedicado, com telas específicas e o
              apoio constante do Tim. Funciona para vendedor autônomo, advogado
              e corretor de imóveis.
            </p>
          </div>
          <div className="relative z-10 border-y border-od-border">
            {AUTH_FEATURES.map(([Icon, label, description]) => {
              const FeatureIcon = Icon as typeof ContactRound;
              return (
                <div
                  key={String(label)}
                  className="flex gap-4 border-t border-od-border py-5 first:border-t-0"
                >
                  <FeatureIcon size={18} className="mt-0.5 shrink-0 text-od-text-3" />
                  <div>
                    <p className="text-sm font-semibold text-od-text">{String(label)}</p>
                    <p className="mt-1 text-xs leading-5 text-od-text-3">{String(description)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative flex h-full overflow-y-auto px-5 py-6 sm:h-auto sm:overflow-visible sm:px-8 sm:py-10 lg:px-12">
          {/* Superfície clara: sem poeira aqui, ela fica só no plano escuro
              (coluna da esquerda) para não competir com os campos do
              formulário. m-auto (não items-center) é proposital: centraliza
              quando sobra espaço, mas se o conteúdo não couber (cadastro em
              telas pequenas) ele nasce colado no topo em vez de cortar a
              metade de cima contra a rolagem — só então essa seção rola. */}
          <div className="relative z-10 m-auto w-full max-w-md">
            <div className="mb-6 flex justify-center lg:hidden">
              <Link
                href="/"
                aria-label="OtimizIA, início"
                className="inline-flex min-h-11 items-center rounded-md focus-visible:ring-2 focus-visible:ring-od-accent"
              >
                <LogoWordmark height={30} />
              </Link>
            </div>
            <h1 className="text-center text-[28px] font-bold tracking-[-0.02em] text-od-text lg:text-left">{title}</h1>
            <p className="mx-auto mt-2 max-w-[65ch] text-center text-sm leading-6 text-od-text-2 lg:mx-0 lg:text-left">{subtitle}</p>

            {error ? (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded border border-danger-200 bg-danger-50 p-3 text-sm text-danger-600"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {notice ? (
              <div
                role="status"
                className="mt-5 flex items-start gap-3 rounded border border-success-200 bg-success-50 p-3 text-sm text-success-600"
              >
                <Check size={17} className="mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            ) : null}

            {children}
            <p className="mt-7 border-t border-od-border pt-5 text-center text-sm text-od-text-2 lg:text-left">{footer}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthField({
  label,
  name,
  required,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required ? (
          <>
            <span className="ml-1 text-od-text-2" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> obrigatório</span>
          </>
        ) : null}
      </label>
      <input id={name} name={name} required={required} className={`field mt-1.5 ${className}`} {...props} />
    </div>
  );
}
