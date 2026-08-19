"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ActionDrawerProps = {
  label: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  triggerClassName?: string;
  initialOpen?: boolean;
  hideTrigger?: boolean;
  onClose?: () => void;
};

export function ActionDrawer({
  label,
  title,
  description,
  icon,
  children,
  triggerClassName,
  initialOpen = false,
  hideTrigger = false,
  onClose,
}: ActionDrawerProps) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (initialOpen) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setOpen(false);
    onCloseRef.current?.();
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        onCloseRef.current?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open, initialOpen]);

  return (
    <>
      {hideTrigger ? null : (
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex min-h-11 items-center gap-2 rounded-md bg-[#6d35df] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#7c4bea]"
        }
      >
        {icon}
        {label}
      </button>
      )}

      {open && typeof document !== "undefined"
        ? createPortal(
          <div className="fixed inset-0 z-[var(--z-modal)]" id={dialogId}>
          <button
            type="button"
            aria-label="Fechar painel"
            className="absolute inset-0 cursor-default bg-black/70"
            onClick={close}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            className="absolute inset-y-0 right-0 flex w-full max-w-[680px] flex-col border-l border-od-border bg-od-bg shadow-[-24px_0_80px_rgba(0,0,0,0.45)]"
          >
            <header className="flex shrink-0 items-start justify-between gap-6 border-b border-od-border px-5 py-5 sm:px-7">
              <div>
                <h2 id={`${dialogId}-title`} className="text-[17px] font-semibold tracking-[-0.02em] text-od-text">
                  {title}
                </h2>
                {description ? <p className="mt-1 text-xs leading-relaxed text-od-text-2">{description}</p> : null}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-od-border text-od-text-2 transition-colors hover:border-od-border-hover hover:text-od-text"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">{children}</div>
          </section>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
