"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import type { LegalLossReasonCode } from "@/lib/supabase/types";

export type LegalLossReason = { code: LegalLossReasonCode; notes: string };

const REASONS: ReadonlyArray<{ code: LegalLossReasonCode; label: string }> = [
  { code: "price", label: "Preço" },
  { code: "competitor", label: "Contratou concorrente" },
  { code: "no_response", label: "Falta de retorno" },
  { code: "timing", label: "Momento inadequado" },
  { code: "profile_mismatch", label: "Perfil incompatível" },
  { code: "other", label: "Outro" },
];

export function LegalLossReasonDialog({
  dealTitle,
  onCancel,
  onConfirm,
  returnFocusTo,
}: {
  dealTitle: string;
  onCancel: () => void;
  onConfirm: (reason: LegalLossReason) => void;
  returnFocusTo?: HTMLElement | null;
}) {
  const [reason, setReason] = useState<LegalLossReasonCode | null>(null);
  const [notes, setNotes] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstReasonRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = returnFocusTo ?? (
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    firstReasonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
      ));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [onCancel, returnFocusTo]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason) return;
    onConfirm({ code: reason, notes });
  }

  function cancelFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/72 p-4"
      onMouseDown={cancelFromBackdrop}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-loss-title"
        aria-describedby="legal-loss-description"
        className="w-full max-w-xl rounded-[15px] border border-white/[0.1] bg-[#19191d] p-5 text-white sm:p-6"
      >
        <header>
          <p className="text-xs font-semibold text-blue-300">Não contratado</p>
          <h2 id="legal-loss-title" className="mt-2 text-xl font-semibold tracking-[-0.02em]">
            Informe o motivo da perda
          </h2>
          <p id="legal-loss-description" className="mt-2 text-sm leading-6 text-white/68">
            Selecione o principal motivo para mover <strong className="font-semibold text-white/82">{dealTitle}</strong>.
          </p>
        </header>

        <form onSubmit={submit} className="mt-5 space-y-5">
          <fieldset>
          <legend className="text-sm font-semibold text-white/78">Motivo</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {REASONS.map((item, index) => (
                <label
                  key={item.code}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[9px] bg-white/[0.045] px-3 text-sm text-white/74 transition-colors hover:bg-white/[0.075] focus-within:ring-2 focus-within:ring-blue-500"
                >
                  <input
                    ref={index === 0 ? firstReasonRef : undefined}
                    type="radio"
                    name="legal-loss-reason"
                    value={item.code}
                    required
                    checked={reason === item.code}
                    onChange={() => setReason(item.code)}
                    className="size-4 accent-blue-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-semibold text-white/78">
            Observação <span className="font-normal text-white/64">(opcional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              className="mt-2 min-h-24 w-full resize-y rounded-[11px] border border-white/[0.1] bg-black/18 px-3 py-3 text-sm font-normal text-white outline-none placeholder:text-white/52 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/35"
              placeholder="Contexto útil para a próxima análise comercial"
            />
            <span className="mt-1 block text-right text-xs font-normal tabular-nums text-white/64">{notes.length}/500</span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-[9px] px-4 text-sm font-semibold text-white/72 hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason}
              className="min-h-11 rounded-[9px] bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#19191d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Confirmar perda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
