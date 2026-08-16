import { IconSettings } from "@/app/(dashboard)/painel/icons";
import { TimAvatar } from "./TimAvatar";

// Cabeçalho compacto do Tim — avatar, nome, status. O rótulo de status usa a
// mesma escala de Label do design system (12/600, uppercase, tracking) em
// vez de um texto cinza qualquer — é isso que faz o cabeçalho ler como parte
// do OtimizIA, não como o topo de um template de chat genérico.
export function TimHeader({
  status,
  onClose,
  onPersonalize,
  avatarSize = 34,
  className,
}: {
  status?: string | null;
  onClose?: () => void;
  onPersonalize?: () => void;
  avatarSize?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-between gap-3 border-b border-od-border bg-od-sidebar px-3 py-2.5 ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <TimAvatar size={avatarSize} online={!status} className="ring-2 ring-od-accent-tint" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight text-white">
            Tim
            {/* Assinatura de que quem responde é o produto, não uma pessoa da
                equipe: some a dúvida antes da primeira resposta. */}
            <span className="rounded-[var(--radius-round)] bg-od-accent-tint px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-od-accent-soft">
              IA
            </span>
          </p>
          <p
            className={`truncate text-[12px] leading-tight ${status ? "text-od-accent-soft" : "text-od-text-3"}`}
            aria-live="polite"
          >
            {status || "Parceiro de negócios"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onPersonalize ? (
          <button
            type="button"
            onClick={onPersonalize}
            aria-label="Personalizar o Tim"
            title="Personalizar o Tim"
            className="grid size-11 place-items-center rounded-full text-od-text-3 hover:bg-white/[0.06] hover:text-white"
          >
            <IconSettings className="h-4 w-4" />
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar conversa com o Tim"
            className="grid size-11 place-items-center rounded-full text-lg leading-none text-od-text-3 hover:bg-white/[0.06] hover:text-white"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
