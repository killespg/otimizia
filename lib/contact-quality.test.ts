import { describe, expect, it } from "vitest";
import { computeContactCompleteness, findDuplicateContacts, type ContactForDedup } from "@/lib/contact-quality";

function contact(overrides: Partial<ContactForDedup> = {}): ContactForDedup {
  return { id: "1", name: "Cliente", phone: null, email: null, ...overrides };
}

describe("findDuplicateContacts", () => {
  it("detecta duplicata por telefone, ignorando formatação", () => {
    const suggestions = findDuplicateContacts([
      contact({ id: "a", phone: "(11) 98888-7777" }),
      contact({ id: "b", phone: "11988887777" }),
    ]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].reason).toEqual("Mesmo telefone");
  });

  it("detecta duplicata por e-mail, ignorando maiúsculas/espaços", () => {
    const suggestions = findDuplicateContacts([
      contact({ id: "a", email: "Ana@Exemplo.com " }),
      contact({ id: "b", email: " ana@exemplo.com" }),
    ]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].reason).toEqual("Mesmo e-mail");
  });

  it("detecta duplicata por nome só quando não há sinal mais forte", () => {
    const suggestions = findDuplicateContacts([
      contact({ id: "a", name: "João Silva" }),
      contact({ id: "b", name: "joão silva" }),
    ]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].reason).toEqual("Mesmo nome");
  });

  it("não duplica o par quando telefone e e-mail batem ao mesmo tempo", () => {
    const suggestions = findDuplicateContacts([
      contact({ id: "a", phone: "11988887777", email: "a@a.com" }),
      contact({ id: "b", phone: "11988887777", email: "a@a.com" }),
    ]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].reason).toEqual("Mesmo telefone");
  });

  it("não sugere nada quando não há contato repetido", () => {
    const suggestions = findDuplicateContacts([
      contact({ id: "a", name: "Ana", phone: "111111111" }),
      contact({ id: "b", name: "Beto", phone: "222222222" }),
    ]);
    expect(suggestions).toHaveLength(0);
  });

  it("ignora telefone curto demais (evita falso positivo por campo vazio/lixo)", () => {
    const suggestions = findDuplicateContacts([
      contact({ id: "a", name: "Ana", phone: "123" }),
      contact({ id: "b", name: "Beto", phone: "123" }),
    ]);
    expect(suggestions).toHaveLength(0);
  });
});

describe("computeContactCompleteness", () => {
  it("calcula 100% quando todos os campos core e extras estão preenchidos", () => {
    const score = computeContactCompleteness(
      { phone: "119", email: "a@a.com", company: "Empresa", source: "Instagram", details: { bairro: "Centro" } },
      [{ key: "bairro" }]
    );
    expect(score).toEqual(100);
  });

  it("calcula proporcionalmente quando faltam campos", () => {
    // 2 de 5 campos (phone + email), sem company/source/bairro
    const score = computeContactCompleteness(
      { phone: "119", email: "a@a.com", company: null, source: null, details: {} },
      [{ key: "bairro" }]
    );
    expect(score).toEqual(40);
  });

  it("retorna 0 quando nenhum campo core está preenchido e não há campos extras", () => {
    const score = computeContactCompleteness({ phone: null, email: null, company: null, source: null, details: {} }, []);
    expect(score).toEqual(0);
  });
});
