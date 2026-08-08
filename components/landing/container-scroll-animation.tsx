import { type ReactNode } from "react";

/**
 * Mantém o título e a prova real do produto no mesmo capítulo da landing.
 * A geometria permanece no fluxo normal para o título nunca disputar espaço
 * com a moldura do produto.
 */
export function ContainerScroll({
  id,
  titleComponent,
  children,
}: {
  id?: string;
  titleComponent: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="lp-shell scroll-mt-[calc(6rem+env(safe-area-inset-top))]"
    >
      <div
        data-landing-panel-heading="true"
        className="relative z-[1] mx-auto max-w-[720px] text-center"
      >
        {titleComponent}
      </div>

      <div
        data-landing-stage="panel"
        className="landing-cinematic-stage landing-cinematic-panel-stage mx-auto mt-8 w-full max-w-5xl overflow-hidden sm:mt-10 lg:mt-12 min-[1536px]:max-w-6xl"
      >
        {children}
      </div>
    </div>
  );
}
