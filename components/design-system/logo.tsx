import * as React from "react";
import Image from "next/image";

const MARK_RATIO = 1;
const WORDMARK_RATIO = 1280 / 329;

/**
 * Marca oficial da OtimizIA.
 *
 * Usa as variantes -2026, que sao RGBA com alfa de verdade. As -approved-dark
 * sao RGB sem canal alfa e por isso dependiam de mix-blend-screen para simular
 * recorte: o truque so funciona sobre fundo escuro, desbota a arte e deixa um
 * retangulo visivel em qualquer outra superficie.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/otimizia-mark-2026-dark.png"
      alt="OtimizIA"
      width={size}
      height={Math.round(size / MARK_RATIO)}
      className={className}
      priority
      unoptimized
    />
  );
}

/** Exact approved horizontal wordmark for dark product surfaces. */
export function LogoWordmark({ height = 30, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/otimizia-logo-2026-dark.png"
      alt="OtimizIA"
      width={Math.round(height * WORDMARK_RATIO)}
      height={height}
      className={className}
      priority
      unoptimized
    />
  );
}

/** Wordmark for surfaces that may switch between light and dark themes. */
export function LogoWordmarkAdaptive({ height = 30, className }: { height?: number; className?: string }) {
  const width = Math.round(height * WORDMARK_RATIO);
  return (
    <>
      <Image
        src="/otimizia-logo-2026.png"
        alt="OtimizIA"
        width={width}
        height={height}
        className={`${className ?? ""} dark:hidden`}
        priority
        unoptimized
      />
      <Image
        src="/otimizia-logo-2026-dark.png"
        alt="OtimizIA"
        width={width}
        height={height}
        className={`${className ?? ""} hidden dark:block`}
        priority
        unoptimized
      />
    </>
  );
}
