import Image from "next/image";
import { IconPaperclip } from "@/app/(dashboard)/painel/icons";
import type { ChatMessage } from "@/lib/ai/types";

function formatTime(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Bolha na estrutura de conversa conhecida: usuário à direita, Tim à esquerda,
// rabinho triangular na primeira bolha de cada sequência e a hora ancorada no
// canto inferior direito, dentro da bolha. O texto reserva espaço pra hora na
// última linha — sem isso, mensagens curtas quebrariam em várias linhas.
//
// As cores saem dos tokens do produto: a fala do usuário usa a cor de ação
// (a mesma dos botões primários) e a do Tim a superfície secundária. O roxo
// que morava aqui não existia em nenhum outro lugar do OtimizIA.
const BUBBLE_RADIUS = "var(--radius-control)";
const TAIL_RADIUS = "4px";
export function TimMessageBubble({
  message,
  isFirstInGroup = true,
  imageSizes,
}: {
  message: ChatMessage;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  imageSizes?: string;
}) {
  const time = formatTime(message.createdAt);
  const isUser = message.role === "user";
  const bg = isUser ? "var(--od-accent)" : "var(--surface-secondary)";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[85%] px-2.5 pb-[18px] pt-1.5 text-[14px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,0.35)] sm:max-w-[min(65%,560px)] ${
          isUser ? "text-white" : "text-white/92"
        }`}
        style={{
          backgroundColor: bg,
          borderRadius: isFirstInGroup
            ? isUser
              ? `${BUBBLE_RADIUS} ${TAIL_RADIUS} ${BUBBLE_RADIUS} ${BUBBLE_RADIUS}`
              : `${TAIL_RADIUS} ${BUBBLE_RADIUS} ${BUBBLE_RADIUS} ${BUBBLE_RADIUS}`
            : BUBBLE_RADIUS,
        }}
      >
        {isFirstInGroup ? (
          <span
            aria-hidden="true"
            className="absolute top-0 block size-0"
            style={
              isUser
                ? { right: "-7px", borderTop: `8px solid ${bg}`, borderRight: "8px solid transparent" }
                : { left: "-7px", borderTop: `8px solid ${bg}`, borderLeft: "8px solid transparent" }
            }
          />
        ) : null}

        {message.imageUrl && (
          <span className="relative mb-1 block h-44 w-full overflow-hidden rounded-[var(--radius-control)]">
            <Image
              src={message.imageUrl}
              alt=""
              fill
              sizes={imageSizes ?? "min(85vw, 420px)"}
              className="object-cover"
              unoptimized
            />
          </span>
        )}
        {message.attachmentName && (
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-white/80">
            <IconPaperclip className="h-3.5 w-3.5 shrink-0" />
            {message.attachmentName}
          </span>
        )}
        {message.content ? (
          <p className="whitespace-pre-wrap break-words" style={{ paddingRight: 46 }}>
            {message.content}
          </p>
        ) : (
          <p style={{ paddingRight: 46 }} />
        )}
        {time ? (
          <span
            className={`absolute bottom-1 right-2.5 text-xs leading-none ${
              isUser ? "text-white/55" : "text-od-text-3"
            }`}
          >
            {time}
          </span>
        ) : null}
      </div>
    </div>
  );
}
