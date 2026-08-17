import { cn } from "@/lib/utils/utils";

/**
 * Traço curto de acento no lugar da régua de ponta a ponta.
 *
 * A landing separava tudo com `border`/`divide` de largura total — virava
 * grade, não ritmo. Este traço (32×2, cobalto, cápsula) pontua o corte
 * sem desenhar uma linha de margem a margem. Vertical só entre as duas
 * colunas de preço, no desktop.
 */
export function LandingMark({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block rounded-full bg-od-accent",
        orientation === "vertical" ? "h-10 w-0.5" : "h-0.5 w-8",
        className,
      )}
    />
  );
}
