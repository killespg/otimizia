import type { FieldSpec } from "@/lib/professions";
import type { Contact } from "@/lib/supabase/types";

// 2.3 (Fase 2): qualidade de dados. Sem dependência — mas 4.1 (matching
// v2), 4.3 (lead scoring) e 4.5 (tendências) dependem deste item: dado
// duplicado ou incompleto quebra qualquer score.
export type ContactForDedup = Pick<Contact, "id" | "name" | "phone" | "email">;

export type DuplicateSuggestion = {
  contactA: ContactForDedup;
  contactB: ContactForDedup;
  reason: "Mesmo telefone" | "Mesmo e-mail" | "Mesmo nome";
};

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function normalizeEmail(email: string | null): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || null;
}

function normalizeName(name: string): string | null {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return normalized.length >= 3 ? normalized : null;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

function addGroupPairs(
  contacts: ContactForDedup[],
  keyOf: (c: ContactForDedup) => string | null,
  reason: DuplicateSuggestion["reason"],
  seenPairs: Set<string>,
  suggestions: DuplicateSuggestion[]
) {
  const groups = new Map<string, ContactForDedup[]>();
  for (const contact of contacts) {
    const key = keyOf(contact);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(contact);
    groups.set(key, group);
  }
  for (const group of Array.from(groups.values())) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = pairKey(group[i].id, group[j].id);
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        suggestions.push({ contactA: group[i], contactB: group[j], reason });
      }
    }
  }
}

// Prioridade: telefone > e-mail > nome — telefone/e-mail iguais são quase
// sempre a mesma pessoa; nome igual é o sinal mais fraco (falso positivo
// mais provável), por isso vem por último e não sobrepõe um par já
// encontrado por um sinal mais forte.
export function findDuplicateContacts(contacts: ContactForDedup[]): DuplicateSuggestion[] {
  const suggestions: DuplicateSuggestion[] = [];
  const seenPairs = new Set<string>();
  addGroupPairs(contacts, (c) => normalizePhone(c.phone), "Mesmo telefone", seenPairs, suggestions);
  addGroupPairs(contacts, (c) => normalizeEmail(c.email), "Mesmo e-mail", seenPairs, suggestions);
  addGroupPairs(contacts, (c) => normalizeName(c.name), "Mesmo nome", seenPairs, suggestions);
  return suggestions;
}

// Score de completude (0-100): quanto dos campos "core" (telefone, e-mail,
// empresa, origem) e dos campos extras da profissão estão preenchidos.
// Nome não entra — é sempre obrigatório, preenchê-lo não diferencia
// completude.
export function computeContactCompleteness(
  contact: Pick<Contact, "phone" | "email" | "company" | "source" | "details">,
  extraFields: Pick<FieldSpec, "key">[]
): number {
  const coreValues = [contact.phone, contact.email, contact.company, contact.source];
  const totalFields = coreValues.length + extraFields.length;
  if (totalFields === 0) return 100;

  const filledCore = coreValues.filter((v) => Boolean(v?.trim())).length;
  const filledExtra = extraFields.filter((f) => Boolean(contact.details?.[f.key]?.trim())).length;
  return Math.round(((filledCore + filledExtra) / totalFields) * 100);
}
