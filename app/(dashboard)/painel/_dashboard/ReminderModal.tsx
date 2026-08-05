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
        className="glass reminder-launch nav-item absolute top-4 right-4 z-10 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-black text-brand-300 hover:text-brand-200 sm:px-4 sm:py-3 lg:top-6 lg:right-6"
      >
        <IconBell className="h-5 w-5" />
        <span className="hidden sm:inline">Novo lembrete</span>
      </button>
    );
  }

  return (
    <form
      action={createTask}
      className="glass reminder-modal fixed inset-x-3 bottom-[calc(7.35rem+env(safe-area-inset-bottom))] z-50 max-h-[min(560px,calc(100dvh-8rem))] overflow-y-auto p-5 lg:absolute lg:inset-x-auto lg:bottom-auto lg:top-6 lg:right-6 lg:z-10 lg:max-h-none lg:w-[360px] lg:overflow-visible"
    >
      <input type="hidden" name="return_to" value="/painel" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/15 text-brand-300">
            <IconBell className="h-5 w-5" />
          </span>
          <h3 className="text-base font-black text-od-text">Novo lembrete</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="nav-item grid h-8 w-8 place-items-center rounded-md text-xl leading-none text-od-text-3 hover:bg-white/[0.06] hover:text-od-text"
          aria-label="Fechar"
        >
          x
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-od-text-2">Titulo do lembrete *</span>
          <input
            name="title"
            required
            placeholder="Ex.: Ligar para cliente"
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-od-text-2">Data e hora *</span>
          <input
            name="due_at"
            type="datetime-local"
            defaultValue={defaultDueAt}
            className="mt-1"
          />
        </label>
        <ContactField contacts={contacts} variant="compact" />
        <label className="block">
          <span className="text-xs font-bold text-od-text-2">Observacao opcional</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Detalhes adicionais..."
            className="mt-1 resize-none"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <PendingButton
          className="nav-item rounded-md bg-brand-700 px-5 py-2 text-sm font-black text-white shadow-[0_14px_30px_-16px_rgba(109,40,217,0.9)] hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
          pendingLabel="Salvando"
        >
          Salvar
        </PendingButton>
      </div>
    </form>
  );
}

