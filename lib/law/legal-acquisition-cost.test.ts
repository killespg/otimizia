import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseLegalAcquisitionCost,
} from "@/lib/law/legal-acquisition-cost";
import {
  canManageFinance,
  canViewFinance,
} from "@/lib/law/law-office";

function acquisitionCostForm(
  fields: Partial<Record<"month" | "marketing" | "commercial" | "notes", string>> = {},
) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  return formData;
}

describe("parseLegalAcquisitionCost", () => {
  it("normaliza mês, converte reais pt-BR em centavos e limpa observações", () => {
    const formData = acquisitionCostForm({
      month: "2026-08",
      marketing: "1.500,00",
      commercial: "300,50",
      notes: "  Google Ads e triagem  ",
    });

    expect(parseLegalAcquisitionCost(formData)).toEqual({
      month: "2026-08-01",
      marketingCents: 150_000,
      commercialCents: 30_050,
      notes: "Google Ads e triagem",
    });
  });

  it("aceita zero e devolve observação vazia como null", () => {
    expect(parseLegalAcquisitionCost(acquisitionCostForm({
      month: "2026-01",
      marketing: "0",
      commercial: "0,00",
      notes: "   ",
    }))).toEqual({
      month: "2026-01-01",
      marketingCents: 0,
      commercialCents: 0,
      notes: null,
    });
  });

  it("aceita uma casa decimal quando o valor pt-BR é inequívoco", () => {
    expect(parseLegalAcquisitionCost(acquisitionCostForm({
      month: "2026-01",
      marketing: "10,5",
      commercial: "0",
    })).marketingCents).toBe(1_050);
  });

  it.each([
    [undefined, "Informe o mês"],
    ["2026-00", "Informe um mês válido"],
    ["2026-13", "Informe um mês válido"],
    ["2026-8", "Informe um mês válido"],
    ["2026-08-01", "Informe um mês válido"],
  ])("rejeita mês ausente ou inválido (%s)", (month, message) => {
    expect(() => parseLegalAcquisitionCost(acquisitionCostForm({
      ...(month === undefined ? {} : { month }),
      marketing: "0",
      commercial: "0",
    }))).toThrow(message);
  });

  it.each([
    ["", "vazio"],
    ["-1,00", "negativo"],
    ["+1,00", "sinal positivo"],
    ["1.50", "ponto decimal ambíguo"],
    ["1.00", "agrupamento ambíguo"],
    ["12.34,56", "milhar mal agrupado"],
    ["1,234", "mais de duas casas decimais"],
    ["1 000,00", "espaço interno"],
    ["R$ 10,00", "prefixo monetário"],
    ["NaN", "NaN"],
    ["Infinity", "infinito"],
  ])("rejeita valor monetário %s (%s)", (marketing) => {
    expect(() => parseLegalAcquisitionCost(acquisitionCostForm({
      month: "2026-08",
      marketing,
      commercial: "0",
    }))).toThrow("Informe um valor válido para Marketing");
  });

  it("rejeita centavos acima do integer do banco", () => {
    expect(() => parseLegalAcquisitionCost(acquisitionCostForm({
      month: "2026-08",
      marketing: "21.474.836,48",
      commercial: "0",
    }))).toThrow("Informe um valor válido para Marketing");
  });

  it("rejeita observações com mais de 500 caracteres", () => {
    expect(() => parseLegalAcquisitionCost(acquisitionCostForm({
      month: "2026-08",
      marketing: "0",
      commercial: "0",
      notes: "a".repeat(501),
    }))).toThrow("As observações podem ter no máximo 500 caracteres");
  });
});

describe("permissões financeiras jurídicas", () => {
  it.each(["owner", "managing_partner", "finance"] as const)(
    "permite que %s gerencie custos",
    (role) => {
      expect(canManageFinance(role)).toBe(true);
      expect(canViewFinance(role)).toBe(true);
    },
  );

  it.each([
    "lawyer",
    "paralegal",
    "receptionist",
    "intern",
    "staff",
  ] as const)("impede que %s gerencie custos", (role) => {
    expect(canManageFinance(role)).toBe(false);
  });

  it("respeita admin da organização sem ampliar canViewFinance por cargo", () => {
    expect(canManageFinance(null)).toBe(false);
    expect(canManageFinance(null, true)).toBe(true);
    expect(canManageFinance("lawyer", true)).toBe(true);
    expect(canViewFinance("lawyer")).toBe(false);
    expect(canViewFinance("lawyer", true)).toBe(true);
  });
});

describe("contratos da captura mensal de custos", () => {
  it("mantém o formulário acessível, responsivo e sem roxo", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/legal/legal-acquisition-cost-form.tsx"),
      "utf8",
    );

    expect(source).toContain('label="Informar custos"');
    expect(source).toContain('title="Custos de aquisição"');
    expect(source).toContain(
      "O CAC soma marketing e operação comercial e divide pelos contratos conquistados no mesmo período.",
    );
    expect(source).toMatch(/<Input[\s\S]*name="month"[\s\S]*type="month"[\s\S]*label="Mês"[\s\S]*required/);
    expect(source).toMatch(/<Input[\s\S]*name="marketing"[\s\S]*label="Marketing \(R\$\)"[\s\S]*required/);
    expect(source).toMatch(/<Input[\s\S]*name="commercial"[\s\S]*label="Operação comercial \(R\$\)"[\s\S]*required/);
    expect(source).toMatch(/<Textarea[\s\S]*name="notes"[\s\S]*label="Observações"[\s\S]*maxLength=\{500\}/);
    expect(source).toContain('pendingLabel="Salvando"');
    expect(source).toContain("min-h-11");
    expect(source).toContain("bg-od-accent");
    expect(source).not.toMatch(/purple|violet|#6d35df|#7c4bea/i);
  });

  it("autoriza no servidor antes do upsert e preserva tenant e auditoria", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/juridico/crm-actions.ts"),
      "utf8",
    );
    const permissionCheck = source.indexOf("canManageFinance(");
    const write = source.indexOf('.from("law_acquisition_costs")');

    expect(source).toContain('supabase.auth.getUser()');
    expect(source).toContain("getActiveOrgId(supabase, user.id)");
    expect(source).toContain('.from("organization_members")');
    expect(source).toContain('.select("role,job_role")');
    expect(source).toContain('.eq("org_id", orgId)');
    expect(source).toContain('.eq("user_id", user.id)');
    expect(source).toContain("hasLegalWorkspace(profile)");
    expect(permissionCheck).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(permissionCheck);
    expect(source).toContain('workspace_key: "law_office"');
    expect(source).toContain("created_by: user.id");
    expect(source).toContain("updated_by: user.id");
    expect(source).toContain('onConflict: "org_id,workspace_key,month"');
    expect(source).toContain('throw new Error("Não foi possível salvar os custos de aquisição.")');
    expect(source.lastIndexOf('revalidatePath("/painel/juridico")')).toBeGreaterThan(write);
  });
});
