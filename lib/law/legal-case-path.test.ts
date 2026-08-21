import { describe, expect, it } from "vitest";
import {
  isLegalCaseUuid,
  legalCaseHref,
  legalCaseHrefOrSearch,
  slugifyLegalCaseTitle,
} from "./legal-case-path";

describe("slugifyLegalCaseTitle", () => {
  it("turns a Portuguese case name into a readable slug", () => {
    expect(slugifyLegalCaseTitle("Reclamatória trabalhista — Ana")).toBe(
      "reclamatoria-trabalhista-ana",
    );
    expect(slugifyLegalCaseTitle("Ação civil pública (nº 12)")).toBe("acao-civil-publica-n-12");
  });

  it("falls back when the title has no letters", () => {
    expect(slugifyLegalCaseTitle("   ***   ")).toBe("caso");
  });

  it("does not emit a bare UUID as the slug", () => {
    expect(slugifyLegalCaseTitle("68efd420-1028-4f78-9914-cfb3673c746f")).toBe(
      "caso-68efd420-1028-4f78-9914-cfb3673c746f",
    );
  });
});

describe("legalCaseHref", () => {
  it("prefers the slug and keeps UUID links working as fallback", () => {
    expect(legalCaseHref("reclamatoria-ana", "case-1")).toBe(
      "/juridico/processos/reclamatoria-ana",
    );
    expect(legalCaseHref(null, "case-1")).toBe("/juridico/processos/case-1");
    expect(legalCaseHrefOrSearch(null, null)).toBe("/juridico/processos#datajud");
  });

  it("recognizes the internal UUID", () => {
    expect(isLegalCaseUuid("68efd420-1028-4f78-9914-cfb3673c746f")).toBe(true);
    expect(isLegalCaseUuid("reclamatoria-ana")).toBe(false);
  });
});
