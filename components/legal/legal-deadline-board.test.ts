import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LegalCase } from "@/lib/supabase/types";
import { LegalDeadlineBoard } from "./legal-deadline-board";

const overdueCase: LegalCase = {
  id: "case-1",
  org_id: "org-1",
  workspace_key: "law_office",
  contact_id: null,
  deal_id: null,
  responsible_id: "user-1",
  created_by: "user-1",
  title: "Execução de título extrajudicial",
  case_number: "5010420-89.2025.8.21.0018",
  area: "Cível",
  court: null,
  jurisdiction: null,
  opposing_party: null,
  status: "active",
  risk_level: "standard",
  confidentiality: "team",
  next_deadline_at: "2026-08-13T15:00:00.000Z",
  summary: null,
  datajud_tribunal_alias: null,
  datajud_last_synced_at: null,
  datajud_sync_failed_count: 0,
  datajud_next_sync_after: null,
  created_at: "2026-08-01T12:00:00.000Z",
  updated_at: "2026-08-01T12:00:00.000Z",
};

describe("LegalDeadlineBoard", () => {
  it("uses one chronological panel and compacts empty queues", () => {
    const html = renderToStaticMarkup(
      createElement(LegalDeadlineBoard, {
        overdue: [overdueCase],
        upcoming: [],
        later: [],
        noDeadline: [],
        memberName: new Map([["user-1", "Mariana Costa"]]),
      }),
    );

    expect(html.match(/data-ui="data-panel"/g)).toHaveLength(1);
    expect(html).toContain('class="ui-metric-band');
    expect(html).toContain("Execução de título extrajudicial");
    expect(html).toContain("Mariana Costa");
    expect(html).toContain("Sem itens em: Próximos 7 dias, Mais adiante e Casos sem prazo.");
    expect(html).not.toContain("Nada nesta fila");
  });
});
