"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  Tag,
} from "@/components/app-ui";
import type { Contact } from "@/lib/supabase/types";
import { Avatar } from "../Avatar";
import {
  IconArrowRight,
  IconMessage,
  IconPhone,
  IconSearch,
  IconUsers,
} from "../icons";

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
      .join(" "),
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

  const withPhone = useMemo(
    () => contacts.filter((contact) => contact.phone).length,
    [contacts],
  );
  const withCompany = useMemo(
    () => contacts.filter((contact) => contact.company).length,
    [contacts],
  );

  const terms = useMemo(
    () => normalize(query).split(/\s+/).filter(Boolean),
    [query],
  );
  const results = useMemo(
    () =>
      terms.length === 0
        ? contacts
        : contacts.filter((contact) => contactMatchesTerms(contact, terms)),
    [contacts, terms],
  );

  return (
    <>
      <PageHeader
        eyebrow="Contatos"
        title={title}
        description={description}
        actions={
          <div className="field flex h-11 w-full items-center gap-2 px-3 lg:w-[360px]">
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
        }
      >
        <Link
          href="/contacts/import"
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          Importar contatos via CSV
          <IconArrowRight className="h-4 w-4" />
        </Link>
      </PageHeader>

      <section className="enter grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Total"
          value={String(contacts.length)}
          icon={IconUsers}
        />
        <StatCard
          label="Com WhatsApp"
          value={String(withPhone)}
          icon={IconPhone}
          tone="warning"
        />
        <StatCard
          label="Com empresa"
          value={String(withCompany)}
          icon={IconMessage}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SectionCard
          flush
          className="order-2 xl:order-1"
          title="Lista de contatos"
          description={
            query
              ? results.length === 0
                ? `Nenhum resultado para "${query}".`
                : `${results.length} ${results.length === 1 ? "resultado" : "resultados"} para "${query}".`
              : results.length === 0
                ? "Comece adicionando seu primeiro cliente."
                : `${results.length} ${results.length === 1 ? "contato salvo" : "contatos salvos"}.`
          }
          actions={<Tag>{String(results.length).padStart(2, "0")}</Tag>}
        >
          {results.length === 0 ? (
            <EmptyState
              icon={IconUsers}
              title={query ? "Nenhum resultado" : "Nenhum contato ainda"}
              hint={
                query
                  ? "Tente buscar por outro nome, empresa, telefone, Instagram ou origem."
                  : "Salve nome, WhatsApp e uma observação simples para começar."
              }
            />
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
                        {contact.company ||
                          contact.instagram ||
                          contact.email ||
                          contact.phone ||
                          "Sem dados extras"}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      {contact.phone && <Tag tone="brand">WhatsApp</Tag>}
                      {contact.instagram && <Tag>Instagram</Tag>}
                      {contact.source && <Tag>{contact.source}</Tag>}
                    </div>
                    <IconArrowRight className="h-4 w-4 text-ink-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-700" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {children}
      </div>
    </>
  );
}

function displayContactName(contact: Pick<Contact, "name">) {
  return typeof contact.name === "string" && contact.name.trim()
    ? contact.name
    : "Cliente sem nome";
}
