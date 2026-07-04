"use client";

import type { CSSProperties } from "react";
import { IconBot, IconMic } from "@/app/(app)/icons";
import { useVoiceCall } from "@/lib/ai/useVoiceCall";

function formatCallTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function VoicePanel() {
  const {
    voiceStatus,
    voiceError,
    voiceSpeaker,
    voiceLevel,
    captions,
    partialCaption,
    callSeconds,
    startVoice,
    stopVoice,
  } = useVoiceCall();

  return (
    <div
      className={
        "voice-panel rounded-lg border border-line bg-surface-2 p-3 " +
        (voiceStatus === "live" ? "is-live" : "")
      }
    >
      {voiceStatus === "live" ? (
        <div className="flex flex-col items-center gap-3 py-1">
          <div className="flex w-full items-center justify-between">
            <span className="voice-live-badge inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-success-700">
              <span className="h-1.5 w-1.5 rounded-full bg-success-600" />
              Ao vivo · {formatCallTime(callSeconds)}
            </span>
            <button
              type="button"
              onClick={stopVoice}
              className="nav-item inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-danger-200 bg-danger-50 px-3 text-[11px] font-black text-danger-700 hover:bg-danger-100"
            >
              Encerrar
            </button>
          </div>

          <div
            className={
              "voice-orb " +
              (voiceSpeaker === "assistant"
                ? "is-speaking"
                : voiceSpeaker === "user"
                  ? "is-listening"
                  : "")
            }
            style={{ "--level": voiceLevel } as CSSProperties}
          >
            <IconBot className="h-6 w-6" />
          </div>

          <p className="text-[11px] font-black uppercase tracking-wide text-ink-muted">
            {voiceSpeaker === "assistant"
              ? "Sócio-Assistente falando"
              : voiceSpeaker === "user"
                ? "Ouvindo você"
                : "Pode falar quando quiser"}
          </p>

          {(captions.length > 0 || partialCaption) && (
            <div className="voice-captions mt-1 max-h-24 w-full space-y-1.5 overflow-y-auto">
              {captions.map((line, index) => (
                <p
                  key={index}
                  className={
                    "text-xs font-medium leading-snug " +
                    (line.role === "user"
                      ? "text-right text-ink-muted"
                      : "text-left text-ink")
                  }
                >
                  {line.text}
                </p>
              ))}
              {partialCaption && partialCaption.text && (
                <p
                  className={
                    "text-xs font-medium italic leading-snug opacity-70 " +
                    (partialCaption.role === "user"
                      ? "text-right text-ink-muted"
                      : "text-left text-ink")
                  }
                >
                  {partialCaption.text}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={
                "grid h-9 w-9 shrink-0 place-items-center rounded-full " +
                (voiceStatus === "connecting"
                  ? "bg-brand-100 text-brand-700"
                  : voiceStatus === "error"
                    ? "bg-danger-50 text-danger-700"
                    : "bg-brand-50 text-brand-700")
              }
            >
              <IconMic
                className={"h-4 w-4 " + (voiceStatus === "connecting" ? "animate-pulse" : "")}
              />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black text-ink">Voz em tempo real</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-ink-muted">
                {voiceStatus === "connecting"
                  ? "Conectando microfone..."
                  : voiceError ?? "Converse por áudio com o Sócio-Assistente."}
              </p>
            </div>
          </div>
          {voiceStatus === "connecting" ? (
            <button
              type="button"
              onClick={stopVoice}
              className="nav-item inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 text-xs font-black text-danger-700 hover:bg-danger-100"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={startVoice}
              className="nav-item inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-brand-700 px-3 text-xs font-black text-white hover:bg-brand-800"
            >
              <IconMic className="h-4 w-4" />
              {voiceStatus === "error" ? "Tentar de novo" : "Falar"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
