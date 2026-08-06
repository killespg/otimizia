import { TimIcon } from "@/components/design-system/tim-icon";

// Avatar do Tim: a marca dele sobre o acento. Até 2026-08-05 usava a marca da
// OtimizIA, o que confundia a empresa com o assistente — Tim é o produto
// falando, mas tem identidade própria, e não um monograma genérico de chatbot
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
      <TimIcon size={Math.round(size * 0.62)} className="text-white" />
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
