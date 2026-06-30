import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { createContact } from "../actions";
import { Avatar } from "../Avatar";
import { IconPlus } from "../icons";

export default async function ContactsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });
  const contacts = (data ?? []) as Contact[];

  return (
    <div>
      <header className="enter">
        <p className="eyebrow">Contatos</p>
        <h1 className="font-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
          Seus clientes
        </h1>
        <p className="mt-2 max-w-md text-[15px] text-ink-soft">
          {contacts.length === 0
            ? "Comece adicionando o primeiro cliente."
            : `${contacts.length} ${contacts.length === 1 ? "contato" : "contatos"} no total.`}
        </p>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Lista */}
        <div className="lg:col-span-2">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-dashed border-line px-6 py-16 text-center">
              <p className="font-display text-lg font-medium text-ink">
                Nenhum contato ainda
              </p>
              <p className="mt-1 max-w-xs text-sm text-ink-soft">
                Salve nome, telefone e uma observação rápida.
              </p>
            </div>
          ) : (
            <div className="border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5 sm:px-5">
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  Nome
                </span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  {String(contacts.length).padStart(2, "0")}
                </span>
              </div>
              <ul className="enter">
                {contacts.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="row-link group flex items-center gap-3 px-4 py-3 hover:bg-surface-2/70 sm:px-5"
                    >
                      <Avatar name={c.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{c.name}</p>
                        <p className="truncate font-mono text-[12px] text-ink-muted">
                          {c.company || c.email || c.phone || "sem dados de contato"}
                        </p>
                      </div>
                      <span className="arrow-nudge font-mono text-base text-ink-muted/60 group-hover:translate-x-0.5 group-hover:text-brand-700">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Novo contato */}
        <div className="border border-t-2 border-line border-t-brand-700 bg-surface lg:sticky lg:top-24 lg:self-start">
          <div className="border-b border-line px-5 py-3">
            <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
              Novo cliente
            </h2>
          </div>
          <form action={createContact} className="space-y-3.5 p-5">
            <Field
              name="name"
              label="Nome"
              required
              maxLength={120}
              autoComplete="name"
            />
            <Field
              name="phone"
              label="Telefone / WhatsApp"
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
            />
            <Field
              name="email"
              label="E-mail"
              type="email"
              maxLength={160}
              autoComplete="email"
            />
            <Field
              name="company"
              label="Empresa"
              maxLength={120}
              autoComplete="organization"
            />
            <Field name="source" label="Origem (ex: Instagram)" maxLength={120} />
            <div>
              <label className="label" htmlFor="notes">
                Observações
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                maxLength={1200}
                className="field mt-1.5 min-h-[76px] resize-y"
              />
            </div>
            <button type="submit" className="btn w-full">
              <IconPlus className="h-4 w-4" />
              Salvar cliente
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

type InputMode =
  | "none"
  | "text"
  | "tel"
  | "url"
  | "email"
  | "numeric"
  | "decimal"
  | "search";

function Field({
  name,
  label,
  type = "text",
  required = false,
  maxLength,
  autoComplete,
  inputMode,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: InputMode;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="field mt-1.5"
      />
    </div>
  );
}
