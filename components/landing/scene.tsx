import type { CSSProperties } from "react";

/**
 * Cena de fundo do herói: camadas CSS/SVG estáticas (sem imagem nem canvas).
 * O movimento é só transform em algumas camadas, dirigido por LandingEffects
 * via --px/--py/--sy. Sem JS, ou com prefers-reduced-motion, a cena fica
 * parada e continua completa.
 *
 * O símbolo é uma releitura do círculo da marca OtimizIA (anel + duas barras
 * diagonais); o logo oficial aparece só nos lugares de assinatura.
 */
export function HeroScene() {
  return (
    <div className="oz-scene" aria-hidden="true">
      <div className="oz-layer oz-fog" />
      <div className="oz-layer oz-pointer" />

      <div className="oz-layer oz-ring oz-ring-a" />
      <div className="oz-layer oz-ring oz-ring-edge oz-ring-a" style={{ "--t": "0px" } as CSSProperties} />
      <div className="oz-layer oz-ring oz-ring-b" />

      <div className="oz-layer oz-lines">
        <svg viewBox="0 0 600 600" fill="none">
          <circle cx="300" cy="300" r="290" stroke="rgba(125,155,255,0.14)" />
          <circle cx="300" cy="300" r="246" stroke="rgba(125,155,255,0.09)" strokeDasharray="1 9" />
          <circle cx="300" cy="300" r="204" stroke="rgba(123,77,255,0.16)" />
          <path d="M300 10a290 290 0 0 1 205 85" stroke="url(#oz-arc)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M20 300h34M546 300h34M300 20v34M300 546v34" stroke="rgba(125,155,255,0.3)" />
          <defs>
            <linearGradient id="oz-arc" x1="300" y1="10" x2="505" y2="95" gradientUnits="userSpaceOnUse">
              <stop stopColor="#245BFF" stopOpacity="0" />
              <stop offset="0.6" stopColor="#7D9BFF" />
              <stop offset="1" stopColor="#7B4DFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="oz-layer oz-symbol">
        <svg viewBox="0 0 400 400" fill="none">
          <defs>
            <radialGradient id="oz-halo" cx="50%" cy="50%" r="50%">
              <stop stopColor="#245BFF" stopOpacity="0.22" />
              <stop offset="0.7" stopColor="#4937FF" stopOpacity="0.06" />
              <stop offset="1" stopColor="#4937FF" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="oz-metal" x1="60" y1="40" x2="340" y2="360" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1b2760" />
              <stop offset="0.45" stopColor="#0a1233" />
              <stop offset="1" stopColor="#151f52" />
            </linearGradient>
            <linearGradient id="oz-edge" x1="40" y1="60" x2="360" y2="340" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5B86FF" />
              <stop offset="0.55" stopColor="#4937FF" stopOpacity="0.35" />
              <stop offset="1" stopColor="#7B4DFF" />
            </linearGradient>
          </defs>
          <circle cx="200" cy="200" r="200" fill="url(#oz-halo)" />
          <circle cx="200" cy="200" r="168" stroke="url(#oz-metal)" strokeWidth="36" />
          <circle cx="200" cy="200" r="186" stroke="url(#oz-edge)" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="150" stroke="url(#oz-edge)" strokeWidth="1" opacity="0.7" />
          <path d="M116 226 176 166h70l-60 60z" fill="url(#oz-metal)" stroke="url(#oz-edge)" strokeWidth="1.2" />
          <path d="M154 276l58-58h68l-58 58z" fill="url(#oz-metal)" stroke="url(#oz-edge)" strokeWidth="1.2" />
        </svg>
      </div>

      <div className="oz-scene-vignette" />
      <div className="oz-scene-fade" />
    </div>
  );
}

/** Acentos discretos para seções abaixo da dobra: arco parcial e halo. */
export function Accent({
  side = "right",
  size = 620,
  top = "12%",
  halo,
}: {
  side?: "left" | "right";
  size?: number;
  top?: string;
  halo?: string;
}) {
  const place = { width: size, [side]: -size * 0.55, top } as CSSProperties;
  return (
    <>
      <div className="oz-accent-ring" style={place} aria-hidden="true" />
      {halo ? (
        <div
          className="oz-halo"
          style={{ ...place, [side]: -size * 0.3, width: size, height: size, "--halo": halo } as CSSProperties}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}
