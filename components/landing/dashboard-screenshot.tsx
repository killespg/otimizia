import Image from "next/image";

const ALT_TEXT =
  "Painel imobiliário da OtimizIA com carteira, visitas, vitrines e comissões";

export function DashboardScreenshot() {
  return (
    <figure
      data-prisma-panel-frame="true"
      className="landing-prisma-panel-frame"
    >
      <div
        data-dashboard-screenshot-viewport="true"
        className="landing-prisma-panel-viewport"
        aria-label="Prévia navegável do painel OtimizIA"
        tabIndex={0}
      >
        <Image
          data-dashboard-screenshot="true"
          src="/landing/painel-imobiliario-mariana.png"
          width={1894}
          height={886}
          alt={ALT_TEXT}
          unoptimized
          className="landing-prisma-panel-image"
        />
      </div>

      <span
        aria-hidden="true"
        className="landing-prisma-panel-drag-hint sm:hidden"
      >
        Arraste para explorar
      </span>

      <figcaption className="sr-only">
        Visão real do painel usado por uma corretora de imóveis na OtimizIA.
      </figcaption>
    </figure>
  );
}
