import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("CRM surface contract", () => {
  it("keeps top-level CRM content in the same panel vocabulary across workspaces", () => {
    const finance = read("app/(dashboard)/painel/financeiro/page.tsx");
    const pipeline = read("app/(dashboard)/painel/funil/page.tsx");
    const reports = read("app/(dashboard)/painel/funil/relatorio/page.tsx");
    const contacts = read("app/(dashboard)/painel/contatos/ContactsExplorer.tsx");
    const tasks = read("app/(dashboard)/painel/tarefas/page.tsx");
    const team = read("app/(dashboard)/painel/equipe/page.tsx");
    const calendar = read("app/(dashboard)/painel/calendario/page.tsx");
    const interactiveSource = [
      calendar,
      read("app/(dashboard)/painel/funil/Board.tsx"),
      read("app/(dashboard)/painel/tarefas/TaskItem.tsx"),
      read("app/(dashboard)/painel/contatos/[id]/page.tsx"),
    ].join("\n");

    expect(finance).toContain("rounded-[var(--radius-panel)] border border-od-accent/25");
    expect(pipeline).toContain('className="ui-metric-band sm:grid-cols-3"');
    expect(reports).toContain("Gestão / Relatórios");
    expect(reports).not.toContain("text-od-title");
    expect(pipeline).not.toContain('usesFlatPipeline ? "scroll-mt-24 border-y');
    expect(contacts).not.toContain('usesFlatSurface ? "overflow-hidden border-y');
    expect(tasks).not.toContain('isSeller ? "scroll-mt-24 border-y');
    expect(team).not.toContain('usesFlatSurface ? "space-y-3 border-t');
    expect(calendar).not.toContain('usesFlatSurface ? "scroll-mt-24 border-y');
    expect(interactiveSource).not.toMatch(/min-h-(?:8|9|10)(?=[" ])/);
    expect(interactiveSource).not.toMatch(/\bh-(?:9|10)(?=[" ])/);
    expect(read("app/(dashboard)/painel/funil/Board.tsx")).not.toContain("100vw");
    expect(read("app/globals.css")).toContain(".pipeline-board");
    expect(read("app/globals.css")).toContain("overscroll-behavior-x: contain");
  });
});
