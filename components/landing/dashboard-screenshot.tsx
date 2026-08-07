import Image from "next/image";

const ALT_TEXT =
  "Painel imobiliário da OtimizIA com carteira, visitas, vitrines e comissões";

export function DashboardScreenshot() {
  return (
    <figure className="relative">
      <div
        data-dashboard-screenshot-viewport="true"
        className="w-full overflow-x-auto overscroll-x-contain bg-[#030817] [scrollbar-color:rgba(145,169,255,0.55)_transparent] [scrollbar-width:thin]"
      >
        <Image
          data-dashboard-screenshot="true"
          src="/landing/painel-imobiliario-mariana.png"
          width={1894}
          height={886}
          alt={ALT_TEXT}
          quality={95}
          sizes="(min-width: 1536px) 1152px, (min-width: 1024px) 1024px, (min-width: 640px) 100vw, 780px"
          className="block h-auto w-[780px] max-w-none sm:w-full"
        />
      </div>

      <figcaption className="sr-only">
        Visão real do painel usado por uma corretora de imóveis na OtimizIA.
      </figcaption>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-[#071126]/80 px-3 py-1.5 text-[11px] font-semibold text-white/76 backdrop-blur-md sm:hidden"
      >
        Arraste para explorar
      </span>
    </figure>
  );
}
