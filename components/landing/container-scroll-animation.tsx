import { type ReactNode } from "react";

/**
 * Mantém o título e a prova real do produto dentro da mesma seção, mas deixa o
 * notebook fora de transforms. Texto fino dentro de screenshots perde nitidez
 * quando o navegador rasteriza a imagem em uma matrix3d, mesmo com o PNG
 * original servido sem compressão.
 *
 * Três correções nesta versão:
 *
 * 1. Moldura única. Havia quatro caixas em volta de um elemento só — esta com
 *    borda e sombra, uma interna com raio próprio, outra na página com padding
 *    e fundo, e a borda do próprio preview. Três bordas concêntricas é card
 *    dentro de card (regra 4). Ficou uma.
 *
 * 2. Altura. A moldura acompanha a proporção do conteúdo. Isso evita área
 *    vazia no print panorâmico e mantém a rolagem horizontal restrita ao
 *    viewport interno no celular.
 *
 * 3. Nitidez. A tampa recebe transformação apenas enquanto acompanha o scroll.
 *    Ao terminar de abrir, o painel volta a escala 1:1 e perde
 *    `will-change: transform`, evitando rasterização permanente do texto.
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
    <div className="lp-shell">
      <div
        data-landing-panel-heading="true"
        className="landing-panel-heading mx-auto max-w-[720px] text-center"
      >
        {titleComponent}
      </div>

      <div
        id={id}
        data-landing-stage="panel"
        className="landing-cinematic-stage landing-cinematic-panel-stage mx-auto mt-[clamp(32px,4vw,56px)] w-full max-w-5xl scroll-mt-0 overflow-hidden min-[1536px]:max-w-6xl"
      >
        {children}
      </div>
    </div>
  );
}
