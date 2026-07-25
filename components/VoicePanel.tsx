"use client";

import type { CSSProperties } from "react";
import { IconMic } from "@/app/(dashboard)/painel/icons";
import { TimAvatar } from "@/components/tim/TimAvatar";
import type { useVoiceCall } from "@/lib/ai/useVoiceCall";

function formatCallTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type VoiceCallState = ReturnType<typeof useVoiceCall>;

// Estado de chamada de voz com o Tim — não é mais um card grande e solto: em
// repouso ("idle") não renderiza nada (o gatilho de voz é o próprio botão do
// compositor); só aparece uma faixa compacta, presa acima do compositor,
// enquanto conecta ou durante a chamada.
export function VoicePanel({
  voiceStatus,
  voiceError,
  voiceSpeaker,
  voiceLevel,
  captions,
  partialCaption,
  callSeconds,
  startVoice,
  stopVoice,
}: Pick<
  VoiceCallState,
  | "voiceStatus"
  | "voiceError"
  | "voiceSpeaker"
  | "voiceLevel"
  | "captions"
  | "partialCaption"
  | "callSeconds"
  | "startVoice"
  | "stopVoice"
>) {
  if (voiceStatus === "idle") return null;

  if (voiceStatus === "connecting" || voiceStatus === "error") {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-2.5 text-xs">
        <span className="flex min-w-0 items-center gap-2 text-white/60">
          <IconMic className={`h-3.5 w-3.5 shrink-0 ${voiceStatus === "connecting" ? "animate-pulse text-violet-300" : "text-red-400"}`} />
          <span className="truncate">
            {voiceStatus === "connecting" ? "Conectando com o Tim…" : voiceError ?? "Não consegui iniciar a chamada."}
          </span>
        </span>
        <button
          type="button"
          onClick={voiceStatus === "connecting" ? stopVoice : startVoice}
          className="min-h-8 shrink-0 rounded border border-white/[0.1] px-2.5 text-[11px] font-semibold text-white/75 hover:bg-white/[0.06]"
        >
          {voiceStatus === "connecting" ? "Cancelar" : "Tentar de novo"}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.08] px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Ao vivo · {formatCallTime(callSeconds)}
        </span>
        <button
          type="button"
          onClick={stopVoice}
          className="min-h-8 rounded border border-red-400/25 bg-red-400/10 px-2.5 text-[11px] font-semibold text-red-300 hover:bg-red-400/20"
        >
          Encerrar
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <span
          className="relative shrink-0"
          style={{ "--level": voiceLevel } as CSSProperties}
        >
          <TimAvatar size={30} className={voiceSpeaker === "assistant" ? "ring-2 ring-violet-400/60" : voiceSpeaker === "user" ? "ring-2 ring-white/30" : ""} />
        </span>
        <p className="min-w-0 flex-1 truncate text-[12px] text-white/55">
          {voiceSpeaker === "assistant" ? "Tim falando" : voiceSpeaker === "user" ? "Ouvindo você…" : "Pode falar quando quiser"}
        </p>
      </div>

      {(captions.length > 0 || partialCaption) && (
        <div className="mt-2 max-h-20 space-y-1 overflow-y-auto">
          {captions.map((line, index) => (
            <p
              key={index}
              className={`text-xs leading-snug ${line.role === "user" ? "text-right text-white/50" : "text-left text-white/75"}`}
            >
              {line.text}
            </p>
          ))}
          {partialCaption && partialCaption.text && (
            <p
              className={`text-xs italic leading-snug opacity-70 ${partialCaption.role === "user" ? "text-right text-white/50" : "text-left text-white/75"}`}
            >
              {partialCaption.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
