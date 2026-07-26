"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Contact } from "@/lib/supabase/types";
import { Avatar } from "../Avatar";
import { IconArrowRight, IconMessage, IconPhone, IconSearch, IconUsers } from "../icons";

// Range U+0300-U+036F: combining diacritical marks split out by NFD
// normalization (e.g. "joão" -> "joa" + combining ~), so search matches
// regardless of accents typed.
function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(value: string) {
  return stripAccents(value).toLocaleLowerCase("pt-BR").trim();
}

function contactMatchesTerms(contact: Contact, terms: string[]) {
  const haystack = normalize(
    [
      contact.name,
      contact.company,
      contact.email,
      contact.phone,
      contact.instagram,
      contact.source,
      contact.notes,
    ]
      .filter(Boolean)
      .join(" ")
  );
  return terms.every((term) => haystack.includes(term));
}

export function ContactsExplorer({
  contacts,
  initialQuery,
  title,
  description,
  children,
}: {
  contacts: Contact[];
  initialQuery: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);

  const withPhone = useMemo(() => contacts.filter((contact) => contact.phone).length, [contacts]);
  const withCompany = useMemo(() => contacts.filter((contact) => contact.company).length, [contacts]);

  const terms = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(
    () => (terms.length === 0 ? contacts : contacts.filter((contact) => contactMatchesTerms(contact, terms))),
    [contacts, terms]
  );

  return (
    <>
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Contatos</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,3.2rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            {title}
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm font-medium leading-relaxed text-ink-soft sm:block">
            {description}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link
              href="/contacts/import"
              className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800"
            >
              Importar contatos via CSV
              <IconArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contacts/duplicidades"
              className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800"
            >
              Ver possíveis duplicatas
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex h-11 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] lg:w-[360px]">
          <IconSearch className="h-5 w-5 shrink-0 text-ink-muted" />
          <label className="sr-only" htmlFor="contacts-search">
            Buscar contatos
          </label>
          <input
            id="contacts-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar contato, empresa, telefone, Instagram..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
      </header>

      <section className="enter grid grid-cols-3 gap-3 sm:gap-4">
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
                {query
                  ? results.length === 0
                    ? `Nenhum resultado para "${query}".`
                    : `${results.length} ${results.length === 1 ? "resultado" : "resultados"} para "${query}".`
                  : results.length === 0
                    ? "Comece adicionando seu primeiro cliente."
                    : `${results.length} ${results.length === 1 ? "contato salvo" : "contatos salvos"}.`}
              </p>
            </div>
            <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-black text-ink-muted">
              {String(results.length).padStart(2, "0")}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
                <IconUsers className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-black text-ink">
                {query ? "Nenhum resultado" : "Nenhum contato ainda"}
              </p>
              {query && (
                <p className="mt-1 max-w-xs text-sm font-medium leading-relaxed text-ink-muted">
                  Tente buscar por outro nome, empresa, telefone, Instagram ou origem.
                </p>
              )}
              {!query && (
                <p className="mt-1 max-w-xs text-sm font-medium leading-relaxed text-ink-muted">
                  Salve nome, WhatsApp e uma observação simples para começar.
                </p>
              )}
            </div>
          ) : (
            <ul className="enter divide-y divide-line">
              {results.map((contact) => (
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
                        {contact.company || contact.instagram || contact.email || contact.phone || "Sem dados extras"}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      {contact.phone && (
                        <span className="tag bg-brand-50 text-brand-700">WhatsApp</span>
                      )}
                      {contact.instagram && (
                        <span className="tag bg-surface-2 text-ink-muted">Instagram</span>
                      )}
                      {contact.source && (
                        <span className="tag bg-surface-2 text-ink-muted">{contact.source}</span>
                      )}
                    </div>
                    <IconArrowRight className="h-4 w-4 text-ink-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-700" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {children}
      </div>
    </>
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
            (pink ? "bg-warning-50 text-warning-700" : "bg-brand-50 text-brand-700")
          }
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function displayContactName(contact: Pick<Contact, "name">) {
  return typeof contact.name === "string" && contact.name.trim() ? contact.name : "Cliente sem nome";
}
