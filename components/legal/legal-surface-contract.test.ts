import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("legal workspace surface contract", () => {
  it("uses the shared rounded vocabulary on every legal tab", () => {
    const deadlines = read("app/(dashboard)/painel/juridico/prazos/page.tsx");
    const datajud = read("app/(dashboard)/painel/juridico/consulta/DatajudSearchForm.tsx");
    const processes = read("app/(dashboard)/painel/juridico/processos/page.tsx");
    const documents = read("app/(dashboard)/painel/juridico/documentos/page.tsx");
    const movements = read("app/(dashboard)/painel/juridico/movimentacoes/page.tsx");
    const legalUi = read("components/legal/legal-ui.tsx");
    const movementList = read("components/legal/legal-movements-list.tsx");
    const compactControls = [
      movementList,
      read("components/legal/deadline-form-calculator.tsx"),
      read("components/legal/deadline-calculator-page.tsx"),
      read("components/legal/document-draft-viewer.tsx"),
      read("components/legal/send-for-signature.tsx"),
      read("app/(dashboard)/painel/juridico/processos/[id]/page.tsx"),
    ].join("\n");
    const source = [deadlines, datajud, processes, documents, movements].join("\n");

    expect(deadlines).toContain("<LegalDeadlineBoard");
    expect(deadlines).toContain('from("legal_deadlines")');
    expect(deadlines).toContain('from("tasks")');
    expect(deadlines).toContain("<TaskForm");
    expect(deadlines).not.toContain("<LegalCaseList");
    expect(legalUi).toContain('from "@/components/ui/surface"');
    expect(source).not.toContain('border border-white/[0.09] bg-[#1e1d22]');
    expect(compactControls).not.toMatch(/(?:min-h|\bh)-(?:8|9|10)(?=[" ])/);
  });
});
