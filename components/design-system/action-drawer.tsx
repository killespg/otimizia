"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

type ActionDrawerProps = {
  label: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  triggerClassName?: string;
  initialOpen?: boolean;
};

export function ActionDrawer({
  label,
  title,
  description,
  icon,
  children,
  triggerClassName,
  initialOpen = false,
}: ActionDrawerProps) {
  const [open, setOpen] = useState(initialOpen);
  const dialogId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
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

      {open ? (
        <div className="fixed inset-0 z-[80]" id={dialogId}>
          <button
            type="button"
            aria-label="Fechar painel"
            className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            className="absolute inset-y-0 right-0 flex w-full max-w-[680px] flex-col border-l border-od-border bg-[#151419] shadow-[-24px_0_80px_rgba(0,0,0,0.45)]"
          >
            <header className="flex shrink-0 items-start justify-between gap-6 border-b border-od-border px-5 py-5 sm:px-7">
              <div>
                <h2 id={`${dialogId}-title`} className="text-[17px] font-semibold tracking-[-0.02em] text-od-text">
                  {title}
                </h2>
                {description ? <p className="mt-1 text-[11px] leading-relaxed text-od-text-2">{description}</p> : null}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-od-border text-od-text-2 transition-colors hover:border-od-border-hover hover:text-od-text"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">{children}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}
