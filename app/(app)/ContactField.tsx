"use client";

import { useId, useState } from "react";

type ContactOption = {
  id: string;
  name: string;
  company?: string | null;
};

const styles = {
  default: {
    label: "label",
    control: "field mt-1.5",
    toggle: "text-xs font-black text-brand-700 hover:text-brand-900",
    row: "flex items-center justify-between gap-2",
  },
  compact: {
    label: "text-xs font-bold text-ink-soft",
    control:
      "mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
    toggle: "text-xs font-black text-brand-700 hover:text-brand-900",
    row: "flex items-center justify-between gap-2",
  },
};

export function ContactField({
  contacts,
  variant = "default",
}: {
  contacts: ContactOption[];
  variant?: "default" | "compact";
}) {
  const [creating, setCreating] = useState(false);
  const selectId = useId();
  const s = styles[variant];

  if (creating) {
    return (
      <div className="space-y-2">
        <div className={s.row}>
          <span className={s.label}>Novo contato</span>
          <button type="button" onClick={() => setCreating(false)} className={s.toggle}>
            Usar contato existente
          </button>
        </div>
        <input
          name="new_contact_name"
          required
          placeholder="Nome"
          maxLength={120}
          className={s.control}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="new_contact_phone"
            placeholder="WhatsApp"
            maxLength={40}
            inputMode="tel"
            className={s.control}
          />
          <input
            name="new_contact_instagram"
            placeholder="@instagram"
            maxLength={60}
            className={s.control}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={s.row}>
        <label className={s.label} htmlFor={selectId}>
          Contato
        </label>
        <button type="button" onClick={() => setCreating(true)} className={s.toggle}>
          + Novo contato
        </button>
      </div>
      <select id={selectId} name="contact_id" defaultValue="" className={s.control}>
        <option value="">Sem contato</option>
        {contacts.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {contact.company ? `${contact.name} - ${contact.company}` : contact.name}
          </option>
        ))}
      </select>
    </div>
  );
}
