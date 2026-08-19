import { describe, expect, it } from "vitest";
import { isLegalTool, isMutatingTool, toolsForWorkspace } from "./definitions";

describe("tools da área jurídica", () => {
  it("todas as tools jurídicas são reconhecidas", () => {
    const legalTools = [
      "list_legal_cases",
      "get_legal_case",
      "list_legal_deadlines",
      "list_legal_case_events",
      "list_legal_documents",
      "list_watched_processes",
      "search_datajud_process",
      "get_legal_business_overview",
      "create_legal_case",
      "update_legal_case",
      "create_legal_deadline",
      "update_legal_deadline",
      "create_legal_event",
      "link_datajud_process",
      "sync_datajud_process",
      "create_legal_document_link",
      "update_legal_document",
      "add_legal_case_member",
      "remove_legal_case_member",
      "delete_legal_case",
      "delete_legal_deadline",
      "delete_legal_document",
    ];
    for (const name of legalTools) {
      expect(isLegalTool(name), name).toBe(true);
    }
    expect(isLegalTool("list_contacts")).toBe(false);
  });

  it("fica de fora do workspace de advocacia as tools que não são jurídicas", () => {
    const legalOnly = toolsForWorkspace("imobiliaria").map((tool) => tool.name);
    expect(legalOnly).not.toContain("list_legal_cases");
    expect(legalOnly).not.toContain("search_datajud_process");
    expect(legalOnly).toContain("list_contacts");
  });

  it("no workspace de advocacia todas as tools estão presentes", () => {
    const names = toolsForWorkspace("law_office").map((tool) => tool.name);
    expect(names).toContain("list_legal_cases");
    expect(names).toContain("search_datajud_process");
  });

  it("marcação de mutação cobre as escritas jurídicas e as exclusões", () => {
    expect(isMutatingTool("create_legal_case")).toBe(true);
    expect(isMutatingTool("update_legal_deadline")).toBe(true);
    expect(isMutatingTool("delete_legal_case")).toBe(true);
    expect(isMutatingTool("get_legal_case")).toBe(false);
    expect(isMutatingTool("list_watched_processes")).toBe(false);
  });
});
