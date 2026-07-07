import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { getProfessionPreset } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { createContact } from "../actions";
import { Avatar } from "../Avatar";
import { PresetFields } from "../PresetFields";
import {
  IconArrowRight,
  IconMessage,
  IconPhone,
  IconPlus,
  IconSearch,
  IconUsers,
} from "../icons";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const supabase = createClient();
  const search = normalizeSearch(searchParams?.q);
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("profession_type").maybeSingle(),
  ]);
  const preset = getProfessionPreset(
    profile?.profession_type ?? user?.user_metadata?.profession_type
  );
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("workspace_key", preset.key)
    .order("created_at", { ascending: false });
  const allContacts = (data ?? []) as Contact[];
  const contacts = search
    ? allContacts.filter((contact) => contactMatchesSearch(contact, search))
    : allContacts;
  const isLivestock = preset.key === "livestock_producer";
  const withPhone = allContacts.filter((contact) => contact.phone).length;
  const withSecondary = isLivestock
    ? allContacts.filter((contact) => contact.company || contact.source).length
    : allContacts.filter((contact) => contact.company).length;
  const copy = contactCopy(isLivestock);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">{copy.section}</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,3.2rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            {preset.contactsTitle}
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm font-medium leading-relaxed text-ink-soft sm:block">
            {preset.contactsDescription}
          </p>
        </div>

        <form
          action="/contacts"
          className="hidden h-11 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] sm:flex lg:w-[360px]"
        >
          <IconSearch className="h-5 w-5 shrink-0 text-ink-muted" />
          <label className="sr-only" htmlFor="contacts-search">
            {copy.searchLabel}
          </label>
          <input
            id="contacts-search"
            name="q"
            type="search"
            defaultValue={search}
            placeholder={copy.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="submit"
            className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-bold text-ink-muted hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Buscar
          </button>
        </form>
      </header>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Total" value={String(allContacts.length)} icon={IconUsers} />
        <MetricCard label={copy.phoneMetric} value={String(withPhone)} icon={IconPhone} pink />
        <MetricCard label={copy.companyMetric} value={String(withSecondary)} icon={IconMessage} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel order-2 overflow-hidden xl:order-1">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
                {copy.listTitle}
              </h2>
              <p className="mt-1 text-sm font-medium text-ink-muted">
                {search
                  ? contacts.length === 0
                    ? `Nenhum resultado para "${search}".`
                    : `${contacts.length} ${contacts.length === 1 ? "resultado" : "resultados"} para "${search}".`
                  : contacts.length === 0
                    ? copy.emptyStart
                    : `${contacts.length} ${contacts.length === 1 ? copy.savedSingular : copy.savedPlural}.`}
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
              <p className="mt-4 text-lg font-black text-ink">
                {search ? "Nenhum resultado" : copy.emptyTitle}
              </p>
              {search && (
                <p className="mt-1 max-w-xs text-sm font-medium leading-relaxed text-ink-muted">
                  {copy.emptySearch}
                </p>
              )}
              {!search && (
              <p className="mt-1 max-w-xs text-sm font-medium leading-relaxed text-ink-muted">
                {copy.emptyHint}
              </p>
              )}
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
                {preset.newContactTitle}
              </h2>
              <p className="text-sm font-medium text-ink-muted">Adicione em poucos campos.</p>
            </div>
          </div>

          <form action={createContact} className="mt-5 space-y-3.5">
            <input type="hidden" name="return_to" value="/contacts" />
            <Field name="name" label="Nome" required maxLength={120} autoComplete="name" />
            <Field
              name="phone"
              label={copy.phoneField}
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
            />
            <Field name="email" label="E-mail" type="email" maxLength={160} autoComplete="email" />
            <Field name="company" label={copy.companyField} maxLength={120} autoComplete="organization" />
            <Field name="source" label="Origem" maxLength={120} />
            <PresetFields fields={preset.contactFields} />
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
              {copy.saveButton}
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
            (pink ? "bg-[#fff7e6] text-[#8a6500]" : "bg-brand-50 text-brand-700")
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

function normalizeSearch(value: string | undefined) {
  return value?.trim().slice(0, 80) ?? "";
}

function contactCopy(isLivestock: boolean) {
  if (isLivestock) {
    return {
      section: "Sujeitos",
      searchLabel: "Buscar sujeitos",
      searchPlaceholder: "Buscar sujeito...",
      phoneMetric: "Com telefone",
      companyMetric: "Com origem",
      listTitle: "Lista de sujeitos",
      emptyStart: "Comece adicionando seu primeiro sujeito.",
      savedSingular: "sujeito salvo",
      savedPlural: "sujeitos salvos",
      emptyTitle: "Nenhum sujeito ainda",
      emptySearch: "Tente buscar por nome, telefone, e-mail ou origem.",
      emptyHint: "Salve nome, telefone e uma observação simples para começar.",
      phoneField: "Telefone / WhatsApp",
      companyField: "Origem",
      saveButton: "Salvar sujeito",
    };
  }

  return {
    section: "Contatos",
    searchLabel: "Buscar contatos",
    searchPlaceholder: "Buscar contato...",
    phoneMetric: "Com WhatsApp",
    companyMetric: "Com empresa",
    listTitle: "Lista de contatos",
    emptyStart: "Comece adicionando seu primeiro cliente.",
    savedSingular: "contato salvo",
    savedPlural: "contatos salvos",
    emptyTitle: "Nenhum contato ainda",
    emptySearch: "Tente buscar por outro nome, empresa, telefone ou origem.",
    emptyHint: "Salve nome, WhatsApp e uma observação simples para começar.",
    phoneField: "Telefone / WhatsApp",
    companyField: "Empresa",
    saveButton: "Salvar cliente",
  };
}

function contactList(contact: Contact) {
  return contact.details?.trello_list || contact.details?.pipeline_list || "";
}

function contactMatchesSearch(contact: Contact, search: string) {
  const haystack = [
    contact.name,
    contact.company,
    contact.email,
    contact.phone,
    contact.source,
    contact.notes,
    contactList(contact),
    ...Object.values(contact.details ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");

  return haystack.includes(search.toLocaleLowerCase("pt-BR"));
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
