"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ActionDrawer } from "@/components/design-system/action-drawer";
import type { Contact } from "@/lib/supabase/types";
import { Avatar } from "../Avatar";
import { IconArrowRight, IconMessage, IconPhone, IconPlus, IconSearch, IconUsers } from "../icons";

// Range U+0300-U+036F: combining diacritical marks split out by NFD
// normalization (e.g. "joão" -> "joa" + combining ~), so search matches
// regardless of accents typed.
function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
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
  newContactTitle,
  eyebrow = "Escritório / Clientes e atendimentos",
  isSeller = false,
  flat = false,
  children,
}: {
  contacts: Contact[];
  initialQuery: string;
  title: string;
  description: string;
  newContactTitle: string;
  eyebrow?: string;
  isSeller?: boolean;
  flat?: boolean;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const usesFlatSurface = isSeller || flat;

  const withPhone = useMemo(() => contacts.filter((contact) => contact.phone).length, [contacts]);
  const withCompany = useMemo(() => contacts.filter((contact) => contact.company).length, [contacts]);

  const terms = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(
    () => (terms.length === 0 ? contacts : contacts.filter((contact) => contactMatchesTerms(contact, terms))),
    [contacts, terms]
  );

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-od-text-2">{eyebrow}</p>
          <h1 className="mt-2 text-od-title text-white">
            {title}
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-white/52 sm:block">
            {description}
          </p>
          <Link
            href="/painel/contatos/importar"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-od-text-2 hover:text-od-text"
          >
            Importar contatos via CSV
            <IconArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/painel/funil" className="ml-5 mt-3 inline-flex items-center gap-1 text-xs font-semibold text-od-text-2 hover:text-od-text">Ver atendimentos<IconArrowRight className="h-4 w-4"/></Link>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/[0.1] bg-[#1e1d22] px-3 lg:w-[360px]">
            <IconSearch className="h-4 w-4 shrink-0 text-od-text-3" />
            <label className="sr-only" htmlFor="contacts-search">
              Buscar contatos
            </label>
            <input
              id="contacts-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar contato, empresa, telefone, Instagram..."
              className="!min-h-0 min-w-0 flex-1 !border-0 !bg-transparent !p-0 text-[13px] text-white/70 !shadow-none outline-none placeholder:text-od-text-3"
            />
          </div>
          <ActionDrawer
            label="Novo cliente"
            title={newContactTitle}
            description="Cadastre o atendimento sem sair da carteira."
            icon={<IconPlus className="h-4 w-4" />}
          >
            {children}
          </ActionDrawer>
        </div>
      </header>

      <section className="ui-metric-band grid-cols-1 sm:grid-cols-3">
        <MetricCard label="Total" value={String(contacts.length)} icon={IconUsers} />
        <MetricCard label="Com WhatsApp" value={String(withPhone)} icon={IconPhone} pink />
        <MetricCard label="Com empresa" value={String(withCompany)} icon={IconMessage} />
      </section>

      <div className="grid gap-5">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Lista de contatos
              </h2>
              <p className="mt-1 text-xs text-white/52">
                {query
                  ? results.length === 0
                    ? `Nenhum resultado para "${query}".`
                    : `${results.length} ${results.length === 1 ? "resultado" : "resultados"} para "${query}".`
                  : results.length === 0
                    ? "Comece adicionando seu primeiro cliente."
                    : `${results.length} ${results.length === 1 ? "contato salvo" : "contatos salvos"}.`}
              </p>
            </div>
            <span className="text-xs font-semibold text-od-text-3">
              {String(results.length).padStart(2, "0")}
            </span>
          </div>

          {results.length === 0 ? (
            <div className={usesFlatSurface ? "flex min-h-36 items-center gap-4 px-5 py-8 text-left" : "flex flex-col items-center justify-center px-6 py-16 text-center"}>
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
                <IconUsers className="h-7 w-7" />
              </span>
              <div>
                <p className={usesFlatSurface ? "text-base font-semibold text-ink" : "mt-4 text-lg font-black text-ink"}>
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
            </div>
          ) : (
            <ul>
              {results.map((contact) => (
                <li key={contact.id}>
                  <Link
                    href={`/painel/contatos/${contact.id}`}
                    className="group flex items-center gap-3 border-b border-white/[0.06] px-5 py-4 hover:bg-white/[0.025]"
                  >
                    <Avatar name={contact.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">
                        {displayContactName(contact)}
                      </p>
                      <p className="mt-1 truncate text-xs text-od-text-3">
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
                    <IconArrowRight className="h-3.5 w-3.5 text-od-text-3 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-od-text" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
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
  icon: (props: { className?: string }) => React.ReactElement;
  pink?: boolean;
}) {
  return (
    <article className="border-b border-white/[0.08] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-center gap-3">
        <span className={pink ? "text-amber-300" : "text-od-text-2"}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-xs text-od-text-3">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-white">
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}

function displayContactName(contact: Pick<Contact, "name">) {
  return typeof contact.name === "string" && contact.name.trim() ? contact.name : "Cliente sem nome";
}
