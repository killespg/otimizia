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
      className={`flex shrink-0 items-center justify-between gap-3 bg-white/[0.03] px-3 py-2.5 ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <TimAvatar size={avatarSize} online={!status} />
        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-tight text-white">Tim</p>
          <p className="truncate text-[12px] leading-tight text-white/45">
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
            className="grid size-10 place-items-center rounded-full text-white/45 hover:bg-white/[0.06] hover:text-white"
          >
            <IconSettings className="h-4 w-4" />
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar conversa com o Tim"
            className="grid size-10 place-items-center rounded-full text-lg leading-none text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
