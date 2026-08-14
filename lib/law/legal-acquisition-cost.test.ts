import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialLegalAcquisitionCostState,
  parseLegalAcquisitionCost,
  type LegalAcquisitionCostActionState,
} from "@/lib/law/legal-acquisition-cost";
import {
  canManageFinance,
  canViewFinance,
} from "@/lib/law/law-office";
import { saveLegalAcquisitionCost } from "@/app/(dashboard)/painel/juridico/crm-actions";
import {
  LegalAcquisitionCostActionForm,
  LegalAcquisitionCostForm,
} from "@/components/legal/legal-acquisition-cost-form";

const actionMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getActiveOrgId: vi.fn(),
  logError: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: actionMocks.createClient,
}));
vi.mock("@/lib/workspace/org", () => ({
  getActiveOrgId: actionMocks.getActiveOrgId,
}));
vi.mock("@/lib/utils/logger", () => ({
  logError: actionMocks.logError,
}));
vi.mock("next/navigation", () => ({
  redirect: actionMocks.redirect,
}));
vi.mock("next/cache", () => ({
  revalidatePath: actionMocks.revalidatePath,
}));

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

type QueryResult = {
  data: Record<string, unknown> | null;
  error: unknown;
};

function queryReturning(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function setupAction(options: {
  user?: { id: string } | null;
  profile?: Record<string, unknown> | null;
  membership?: Record<string, unknown> | null;
  upsertError?: unknown;
  upsertReject?: unknown;
} = {}) {
  const profileQuery = queryReturning({
    data: options.profile === undefined
      ? { profession_type: "law_office", profession_types: ["law_office"], is_admin: false }
      : options.profile,
    error: null,
  });
  const membershipQuery = queryReturning({
    data: options.membership === undefined
      ? { role: "member", job_role: "finance" }
      : options.membership,
    error: null,
  });
  const upsert = vi.fn();
  if (options.upsertReject) upsert.mockRejectedValue(options.upsertReject);
  else upsert.mockResolvedValue({ error: options.upsertError ?? null });
  const costQuery = { upsert };
  const from = vi.fn((table: string) => {
    if (table === "profiles") return profileQuery;
    if (table === "organization_members") return membershipQuery;
    if (table === "law_acquisition_costs") return costQuery;
    throw new Error(`Tabela inesperada no teste: ${table}`);
  });
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user === undefined ? { id: "user-1" } : options.user },
      }),
    },
    from,
  };
  actionMocks.createClient.mockResolvedValue(supabase);
  actionMocks.getActiveOrgId.mockResolvedValue("org-1");
  return { costQuery, from, membershipQuery, profileQuery, supabase };
}

describe("saveLegalAcquisitionCost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("devolve erro recuperável e preserva 1.00 para correção", async () => {
    const { costQuery } = setupAction();
    const formData = acquisitionCostForm({
      month: "2026-08",
      marketing: "1.00",
      commercial: "300,50",
      notes: "  campanha  ",
    });

    await expect(saveLegalAcquisitionCost(
      initialLegalAcquisitionCostState,
      formData,
    )).resolves.toEqual({
      status: "error",
      message: "Informe um valor válido para Marketing.",
      revision: 1,
      values: {
        month: "2026-08",
        marketing: "1.00",
        commercial: "300,50",
        notes: "  campanha  ",
      },
    });
    expect(costQuery.upsert).not.toHaveBeenCalled();
    expect(actionMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("devolve erro recuperável quando o cargo não pode gerenciar finanças", async () => {
    const { costQuery } = setupAction({
      membership: { role: "member", job_role: "lawyer" },
    });

    const state = await saveLegalAcquisitionCost(
      initialLegalAcquisitionCostState,
      acquisitionCostForm({ month: "2026-08", marketing: "0", commercial: "0" }),
    );

    expect(state.status).toBe("error");
    expect(state.message).toBe("Seu cargo não pode gerenciar custos de aquisição.");
    expect(costQuery.upsert).not.toHaveBeenCalled();
    expect(actionMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("não vaza o erro do banco nem revalida quando o upsert falha", async () => {
    const { costQuery } = setupAction({
      upsertError: { code: "42501", message: "secret RLS details" },
    });
    const formData = acquisitionCostForm({
      month: "2026-08",
      marketing: "500,00",
      commercial: "300,50",
    });

    const state = await saveLegalAcquisitionCost(initialLegalAcquisitionCostState, formData);

    expect(costQuery.upsert).toHaveBeenCalledOnce();
    expect(state).toMatchObject({
      status: "error",
      message: "Não foi possível salvar os custos de aquisição.",
    });
    expect(JSON.stringify(state)).not.toContain("secret RLS details");
    expect(actionMocks.logError).toHaveBeenCalledOnce();
    expect(actionMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("recupera uma rejeição transitória do client sem expor detalhes", async () => {
    setupAction({ upsertReject: new Error("network internals") });
    const formData = acquisitionCostForm({
      month: "2026-08",
      marketing: "500,00",
      commercial: "300,50",
    });

    const state = await saveLegalAcquisitionCost(initialLegalAcquisitionCostState, formData);

    expect(state).toMatchObject({
      status: "error",
      message: "Não foi possível salvar os custos de aquisição.",
    });
    expect(JSON.stringify(state)).not.toContain("network internals");
    expect(actionMocks.logError).toHaveBeenCalledOnce();
    expect(actionMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("faz upsert auditável, revalida e devolve confirmação no sucesso", async () => {
    const { costQuery } = setupAction();
    const formData = acquisitionCostForm({
      month: "2026-08",
      marketing: "500,00",
      commercial: "300,50",
      notes: "Google Ads",
    });

    const state = await saveLegalAcquisitionCost(initialLegalAcquisitionCostState, formData);

    expect(costQuery.upsert).toHaveBeenCalledWith({
      org_id: "org-1",
      workspace_key: "law_office",
      month: "2026-08-01",
      marketing_cents: 50_000,
      commercial_cents: 30_050,
      notes: "Google Ads",
      created_by: "user-1",
      updated_by: "user-1",
    }, { onConflict: "org_id,workspace_key,month" });
    expect(actionMocks.revalidatePath).toHaveBeenCalledWith("/painel/juridico");
    expect(state).toMatchObject({
      status: "success",
      message: "Custos de aquisição salvos.",
    });
  });

  it("mantém o redirect fixo para sessão ausente", async () => {
    setupAction({ user: null });

    await expect(saveLegalAcquisitionCost(
      initialLegalAcquisitionCostState,
      acquisitionCostForm(),
    )).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});

describe("LegalAcquisitionCostForm", () => {
  it("renderiza erro acessível com os valores submetidos disponíveis", () => {
    const errorState: LegalAcquisitionCostActionState = {
      status: "error",
      message: "Informe um valor válido para Marketing.",
      revision: 1,
      values: {
        month: "2026-08",
        marketing: "1.00",
        commercial: "300,50",
        notes: "campanha",
      },
    };
    const html = renderToStaticMarkup(createElement(
      LegalAcquisitionCostActionForm,
      { initialState: errorState },
    ));

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain("Informe um valor válido para Marketing.");
    expect(html).toContain('name="marketing"');
    expect(html).toContain('value="1.00"');
    expect(html).toContain("Operação comercial (R$)");
    expect(html).toContain('maxLength="500"');
    expect(html).toContain("Salvando");
    expect(html).toContain("min-h-11");
    expect(html).not.toMatch(/purple|violet|#6d35df|#7c4bea/i);
  });

  it("renderiza confirmação em região live e trigger azul", () => {
    const successState: LegalAcquisitionCostActionState = {
      ...initialLegalAcquisitionCostState,
      status: "success",
      message: "Custos de aquisição salvos.",
      revision: 1,
    };
    const feedbackHtml = renderToStaticMarkup(createElement(
      LegalAcquisitionCostActionForm,
      { initialState: successState },
    ));
    const drawerHtml = renderToStaticMarkup(createElement(LegalAcquisitionCostForm));

    expect(feedbackHtml).toContain('role="status"');
    expect(feedbackHtml).toContain('aria-live="polite"');
    expect(feedbackHtml).toContain("Custos de aquisição salvos.");
    expect(drawerHtml).toContain("Informar custos");
    expect(drawerHtml).toContain("bg-od-accent");
    expect(drawerHtml).toContain("min-h-11");
  });
});
