import * as React from "react";
import Image from "next/image";

const MARK_RATIO = 1;
const WORDMARK_RATIO = 1280 / 329;

/** Exact approved OtimizIA mark, preserved from the supplied artwork. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/otimizia-mark-approved-dark.png"
      alt="OtimizIA"
      width={size}
      height={Math.round(size / MARK_RATIO)}
      className={`mix-blend-screen ${className ?? ""}`}
      priority
      unoptimized
    />
  );
}

/** Exact approved horizontal wordmark for dark product surfaces. */
export function LogoWordmark({ height = 30, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/otimizia-logo-approved-dark.png"
      alt="OtimizIA"
      width={Math.round(height * WORDMARK_RATIO)}
      height={height}
      className={`mix-blend-screen ${className ?? ""}`}
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
        src="/otimizia-logo-approved-dark.png"
        alt="OtimizIA"
        width={width}
        height={height}
        className={`${className ?? ""} hidden mix-blend-screen dark:block`}
        priority
        unoptimized
      />
    </>
  );
}
