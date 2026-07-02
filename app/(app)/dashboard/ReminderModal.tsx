"use client";

import { useState } from "react";
import { PendingButton } from "@/components/PendingButton";
import { createTask } from "../actions";
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
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="reminder-launch nav-item absolute bottom-6 right-6 z-10 hidden items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm font-black text-brand-700 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.72)] hover:bg-surface-2 lg:inline-flex"
      >
        <IconBell className="h-5 w-5" />
        Novo lembrete
      </button>
    );
  }

  return (
    <form
      action={createTask}
      className="reminder-modal absolute bottom-6 right-6 z-10 hidden w-[360px] rounded-lg border border-line bg-white p-5 shadow-[0_22px_60px_-28px_rgba(15,23,42,0.65)] lg:block"
    >
      <input type="hidden" name="return_to" value="/dashboard" />
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
          className="nav-item grid h-8 w-8 place-items-center rounded-md text-xl leading-none text-ink-muted hover:bg-surface-2 hover:text-ink"
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
            className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Data e hora *</span>
          <input
            name="due_at"
            type="datetime-local"
            defaultValue={defaultDueAt}
            className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Relacionado a</span>
          <select
            name="contact_id"
            className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            defaultValue=""
          >
            <option value="">Selecione um contato ou empresa</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.company ? `${contact.name} - ${contact.company}` : contact.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Observacao opcional</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Detalhes adicionais..."
            className="mt-1 w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="nav-item rounded-md border border-line bg-white px-4 py-2 text-sm font-bold text-ink-soft hover:bg-surface-2 hover:text-ink"
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
