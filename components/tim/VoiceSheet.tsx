"use client";

import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { TimAvatar } from "@/components/tim/TimAvatar";
import { VoicePanel } from "@/components/tim/VoicePanel";
import { useVoiceCall } from "@/lib/ai/hooks/useVoiceCall";

/**
 * Folha de conversa por voz com o Tim, aberta pelo botão central da barra do
 * celular.
 *
 * Só é montada enquanto está aberta: `useVoiceCall` encerra a chamada no
 * unmount, então fechar a folha desliga o microfone sem tratamento extra.
 *
 * A chamada começa sozinha na abertura — quem toca no botão do Tim já quer
 * falar, e obrigar um segundo toque em "iniciar" só adiciona atrito.
 */
export function VoiceSheet({
  assistantHref,
  onClose,
}: {
  assistantHref: string;
  onClose: () => void;
}) {
  const voice = useVoiceCall();
  const panelRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const startVoice = voice.startVoice;

  useEffect(() => {
    // A permissão de microfone é pedida aqui; se o usuário negar, o próprio
    // VoicePanel mostra o erro e o botão de tentar de novo.
    void startVoice();
    // Intencionalmente só na montagem: reiniciar a cada render derrubaria a
    // chamada em curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    });

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <motion.button
        type="button"
        aria-label="Fechar conversa por voz"
        onClick={onClose}
        className="fixed inset-0 z-[var(--z-dropdown)] bg-black/55 md:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.16 }}
      />
      <motion.section
        ref={panelRef}
        id="tim-voice-sheet"
        data-tim-voice-sheet
        role="dialog"
        aria-modal="true"
        aria-label="Conversa por voz com o Tim"
        onKeyDown={trapFocus}
        className="glass fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[var(--z-sticky)] mx-auto max-h-[66dvh] max-w-md overflow-y-auto rounded-3xl md:hidden"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex min-h-14 items-center gap-3 px-4">
          <TimAvatar size={32} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-od-text">Falando com o Tim</span>
            <span className="block text-xs text-od-text-3">
              Ele tem o contexto do seu negócio
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar conversa por voz"
            className="grid size-11 shrink-0 place-items-center rounded-full text-od-text-3 hover:bg-white/[0.06] hover:text-od-text"
          >
            <X size={18} />
          </button>
        </div>

        {voice.voiceStatus === "idle" ? (
          <p className="border-t border-od-border px-4 py-3 text-xs text-od-text-3">
            Preparando o microfone…
          </p>
        ) : (
          <VoicePanel
            voiceStatus={voice.voiceStatus}
            voiceError={voice.voiceError}
            voiceSpeaker={voice.voiceSpeaker}
            voiceLevel={voice.voiceLevel}
            captions={voice.captions}
            partialCaption={voice.partialCaption}
            callSeconds={voice.callSeconds}
            startVoice={voice.startVoice}
            stopVoice={voice.stopVoice}
          />
        )}

        {/* Saída para a conversa completa: voz resolve o pedido rápido, mas
            anexos, histórico e texto continuam vivendo na página do Tim. */}
        <Link
          href={assistantHref}
          onClick={onClose}
          className="flex min-h-12 items-center gap-2 border-t border-od-border px-4 text-xs font-semibold text-od-text-2 hover:bg-white/[0.03] hover:text-od-text"
        >
          <span className="min-w-0 flex-1">Abrir a conversa completa</span>
          <ArrowRight size={15} className="shrink-0 text-od-text-3" />
        </Link>
      </motion.section>
    </>
  );
}
