import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { createContact } from "../actions";
import { Avatar } from "../Avatar";
import {
  IconArrowRight,
  IconMessage,
  IconPhone,
  IconPlus,
  IconSearch,
  IconUsers,
} from "../icons";

export default async function ContactsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });
  const contacts = (data ?? []) as Contact[];
  const withPhone = contacts.filter((contact) => contact.phone).length;
  const withCompany = contacts.filter((contact) => contact.company).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Contatos</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,3.2rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            Seus clientes
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-soft">
            Salve clientes, empresas e detalhes para não perder o próximo contato.
          </p>
        </div>

        <label className="flex h-11 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] lg:w-[360px]">
          <IconSearch className="h-5 w-5 shrink-0 text-ink-muted" />
          <span className="sr-only">Buscar contatos</span>
          <input
            type="search"
            placeholder="Buscar contato..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
      </header>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Total" value={String(contacts.length)} icon={IconUsers} />
        <MetricCard label="Com WhatsApp" value={String(withPhone)} icon={IconPhone} pink />
        <MetricCard label="Com empresa" value={String(withCompany)} icon={IconMessage} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel order-2 overflow-hidden xl:order-1">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
                Lista de contatos
              </h2>
              <p className="mt-1 text-sm font-medium text-ink-muted">
                {contacts.length === 0
                  ? "Comece adicionando seu primeiro cliente."
                  : `${contacts.length} ${contacts.length === 1 ? "contato salvo" : "contatos salvos"}.`}
              </p>
            </div>
            <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-black text-ink-muted">
              {String(contacts.length).padStart(2, "0")}
            </span>
          </div>

          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
                <IconUsers className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-black text-ink">Nenhum contato ainda</p>
              <p className="mt-1 max-w-xs text-sm font-medium leading-relaxed text-ink-muted">
                Salve nome, WhatsApp e uma observação simples para começar.
              </p>
            </div>
          ) : (
            <ul className="enter divide-y divide-line">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="row-link group flex items-center gap-3 px-5 py-4 hover:bg-[#f8fbff]"
                  >
                    <Avatar name={contact.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-ink">
                        {displayContactName(contact)}
                      </p>
                      <p className="truncate text-xs font-bold text-ink-muted">
                        {contact.company || contact.email || contact.phone || "Sem dados extras"}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      {contact.phone && (
                        <span className="tag bg-brand-50 text-brand-700">
                          WhatsApp
                        </span>
                      )}
                      {contact.source && (
                        <span className="tag bg-surface-2 text-ink-muted">
                          {contact.source}
                        </span>
                      )}
                    </div>
                    <IconArrowRight className="h-4 w-4 text-ink-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-700" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel order-1 h-max p-5 xl:sticky xl:top-8 xl:order-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700">
              <IconPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
                Novo cliente
              </h2>
              <p className="text-sm font-medium text-ink-muted">Adicione em poucos campos.</p>
            </div>
          </div>

          <form action={createContact} className="mt-5 space-y-3.5">
            <input type="hidden" name="return_to" value="/contacts" />
            <Field name="name" label="Nome" required maxLength={120} autoComplete="name" />
            <Field
              name="phone"
              label="Telefone / WhatsApp"
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
            />
            <Field name="email" label="E-mail" type="email" maxLength={160} autoComplete="email" />
            <Field name="company" label="Empresa" maxLength={120} autoComplete="organization" />
            <Field name="source" label="Origem" maxLength={120} />
            <div>
              <label className="label" htmlFor="notes">
                Observações
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={1200}
                className="field mt-1.5 min-h-[88px] resize-y"
              />
            </div>
            <PendingButton className="btn w-full" pendingLabel="Salvando">
              <IconPlus className="h-4 w-4" />
              Salvar cliente
            </PendingButton>
          </form>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  pink = false,
}: {
  label: string;
  value: string;
  icon: (props: { className?: string }) => JSX.Element;
  pink?: boolean;
}) {
  return (
    <article className="panel p-3 sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight text-ink-soft sm:text-sm">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink sm:mt-3 sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          className={
            "hidden h-11 w-11 place-items-center rounded-full sm:grid " +
            (pink ? "bg-pink-100 text-pink-600" : "bg-brand-50 text-brand-700")
          }
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
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

function displayContactName(contact: Pick<Contact, "name">) {
  return typeof contact.name === "string" && contact.name.trim()
    ? contact.name
    : "Cliente sem nome";
}

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
        {required && (
          <>
            <span className="ml-1 text-brand-700" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> obrigatório</span>
          </>
        )}
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
