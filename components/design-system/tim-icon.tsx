/**
 * Ícone do Tim para o botão flutuante da barra do celular.
 *
 * Duas camadas: anéis concêntricos finos ao fundo, que dão a leitura de lente
 * (ou de onda saindo do centro), e três sparkles à frente. Tudo em
 * `currentColor` — quem monta o botão decide a cor, e o ícone acompanha.
 */

/**
 * Estrela de quatro pontas com lados côncavos. Cada ponta sai do centro e as
 * curvas se encontram no meio de cada lado; `waist` controla o quanto a
 * cintura afunda — quanto menor, mais fina e mais afiada fica a ponta.
 */
function sparklePath(cx: number, cy: number, radius: number, waist = 0.2) {
  const k = radius * waist;
  return [
    `M ${cx} ${cy - radius}`,
    `Q ${cx + k} ${cy - k} ${cx + radius} ${cy}`,
    `Q ${cx + k} ${cy + k} ${cx} ${cy + radius}`,
    `Q ${cx - k} ${cy + k} ${cx - radius} ${cy}`,
    `Q ${cx - k} ${cy - k} ${cx} ${cy - radius}`,
    "Z",
  ].join(" ");
}

// Opacidade cresce para dentro: o anel externo quase some e o interno segura o
// olho no centro, que é onde ficam os sparkles.
const RINGS = [
  { r: 15.2, opacity: 0.1 },
  { r: 12, opacity: 0.16 },
  { r: 8.75, opacity: 0.24 },
];

// A estrela principal fica à esquerda do centro geométrico para abrir espaço
// às duas menores; o conjunto é que fica centrado, não a estrela maior.
const SPARKLES = [
  { cx: 13.4, cy: 17, r: 7.2, opacity: 1 },
  { cx: 22.2, cy: 10.6, r: 3.9, opacity: 0.92 },
  { cx: 23.1, cy: 19.6, r: 2.9, opacity: 0.78 },
];

/**
 * Aceita `strokeWidth` para poder ocupar o lugar de um ícone do lucide na
 * navegação, que engrossa o traço do item ativo. Não é adereço ignorado: o
 * valor vai para os anéis, que é o traço que o ícone realmente tem.
 */
export function TimIcon({
  size = 30,
  strokeWidth = 1.8,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {RINGS.map((ring) => (
        <circle
          key={ring.r}
          cx="16"
          cy="16"
          r={ring.r}
          stroke="currentColor"
          strokeWidth={strokeWidth * 0.5}
          opacity={ring.opacity}
        />
      ))}
      {SPARKLES.map((sparkle) => (
        <path
          key={`${sparkle.cx}-${sparkle.cy}`}
          d={sparklePath(sparkle.cx, sparkle.cy, sparkle.r)}
          fill="currentColor"
          opacity={sparkle.opacity}
        />
      ))}
    </svg>
  );
}
