"use client";

import { useState } from "react";
import { PendingButton } from "@/components/ui/PendingButton";
import { createTask } from "../actions";
import { ContactField } from "../ContactField";
import { IconBell } from "../icons";

type ContactOption = {
  id: string;
  name: string;
  company: string | null;
};

type ReminderModalProps = {
  contacts: ContactOption[];
  defaultDueAt: string;
};

export function ReminderModal({ contacts, defaultDueAt }: ReminderModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="reminder-launch nav-item absolute top-4 right-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm font-black text-brand-700 hover:bg-surface-2 sm:px-4 lg:top-6 lg:right-6"
      >
        <IconBell className="h-5 w-5" />
        <span className="hidden sm:inline">Novo lembrete</span>
      </button>
    );
  }

  return (
    <form
      action={createTask}
      className="reminder-modal fixed inset-x-3 bottom-[calc(7.2rem+env(safe-area-inset-bottom))] z-50 max-h-[min(560px,calc(100dvh-8rem))] overflow-y-auto rounded-[var(--radius-panel)] border border-line bg-od-surface p-5 lg:absolute lg:inset-x-auto lg:bottom-auto lg:top-6 lg:right-6 lg:z-10 lg:max-h-none lg:w-[360px] lg:overflow-visible"
    >
      <input type="hidden" name="return_to" value="/painel" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
            <IconBell className="h-5 w-5" />
          </span>
          <h3 className="text-base font-black text-ink">Novo lembrete</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="nav-item grid size-11 place-items-center rounded-[var(--radius-control)] text-xl leading-none text-ink-muted hover:bg-surface-2 hover:text-ink"
          aria-label="Fechar"
        >
          x
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Titulo do lembrete *</span>
          <input
            name="title"
            required
            placeholder="Ex.: Ligar para cliente"
            className="mt-1 h-11 w-full rounded-[var(--radius-inner)] border border-line bg-od-muted-surface px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Data e hora *</span>
          <input
            name="due_at"
            type="datetime-local"
            defaultValue={defaultDueAt}
            className="mt-1 h-11 w-full rounded-[var(--radius-inner)] border border-line bg-od-muted-surface px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <ContactField contacts={contacts} variant="compact" />
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Observacao opcional</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Detalhes adicionais..."
            className="mt-1 w-full resize-none rounded-[var(--radius-inner)] border border-line bg-od-muted-surface px-3 py-2 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="nav-item min-h-11 rounded-[var(--radius-control)] border border-line bg-od-muted-surface px-4 text-sm font-bold text-ink-soft hover:bg-surface-2 hover:text-ink"
        >
          Cancelar
        </button>
        <PendingButton
          className="nav-item min-h-11 rounded-[var(--radius-control)] bg-brand-700 px-5 text-sm font-black text-white hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
          pendingLabel="Salvando"
        >
          Salvar
        </PendingButton>
      </div>
    </form>
  );
}
