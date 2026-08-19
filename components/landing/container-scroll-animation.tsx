import { type ReactNode } from "react";

/**
 * Moldura estática do painel demonstrativo. Sem escala ou perspectiva: além de
 * preservar a legibilidade, isso mantém os alvos de toque no tamanho físico
 * declarado pelos componentes.
 */
export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[1180px] px-5 py-20 sm:px-8 md:py-24 min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px]"
    >
      <div className="mx-auto max-w-5xl text-center min-[1536px]:max-w-6xl min-[1800px]:max-w-7xl min-[2200px]:max-w-[1600px]">
        {titleComponent}
      </div>

      <div
        className="mx-auto h-[38rem] w-full max-w-5xl overflow-hidden rounded-lg border border-od-border bg-od-surface p-2 shadow-od-card sm:h-[42rem] md:h-[46rem] md:p-3 min-[1536px]:max-w-6xl min-[1800px]:max-w-7xl min-[2200px]:max-w-[1600px]"
      >
        <div className="h-full w-full overflow-hidden rounded bg-od-muted-surface">
          {children}
        </div>
      </div>
    </div>
  );
}
