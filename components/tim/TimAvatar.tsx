import { LogoMark } from "@/components/design-system/logo";

// Avatar do Tim: a marca real do OtimizIA sobre o acento, não um monograma
// genérico de chatbot. Tim é o produto falando, não um bot separado colado
// em cima dele.
export function TimAvatar({
  size = 36,
  online,
  className,
}: {
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-od-accent ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Invertida para branco: a marca é azul-violeta e o avatar usa o roxo
          da marca, então sem inverter o símbolo fica em 1,13:1 e desaparece. */}
      <LogoMark size={Math.round(size * 0.56)} className="brightness-0 invert" />
      {online ? (
        <span
          className="absolute rounded-full border-2 border-od-bg bg-emerald-400"
          style={{
            width: Math.max(8, Math.round(size * 0.3)),
            height: Math.max(8, Math.round(size * 0.3)),
            right: -1,
            bottom: -1,
          }}
        />
      ) : null}
    </span>
  );
}
