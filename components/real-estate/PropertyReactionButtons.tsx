"use client";

import { useState } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type Reaction = "interessado" | "sem_interesse" | "quero_visitar";

const OPTIONS: { value: Reaction; label: string }[] = [
  { value: "interessado", label: "Tenho interesse" },
  { value: "sem_interesse", label: "Não gostei" },
  { value: "quero_visitar", label: "Quero visitar" },
];

export function PropertyReactionButtons({ token, propertyId }: { token: string; propertyId: string }) {
  const [selected, setSelected] = useState<Reaction | null>(null);
  const [sending, setSending] = useState(false);

  async function react(reaction: Reaction) {
    if (sending) return;
    setSending(true);
    try {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error } = await supabase.rpc("record_property_reaction", {
        p_token: token,
        p_property_id: propertyId,
        p_reaction: reaction,
      });
      if (!error) setSelected(reaction);
    } finally {
      setSending(false);
    }
  }

  if (selected) {
    return <p className="text-sm font-semibold text-brand-700">Obrigado! Registramos: {OPTIONS.find((o) => o.value === selected)?.label}.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={sending}
          onClick={() => react(option.value)}
          className="press-sm rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
