import { describe, expect, it } from "vitest";
import { getProfessionPreset } from "@/lib/people/professions";
import type { Task } from "@/lib/supabase/types";
import {
  calendarToneClass,
  capitalize,
  countChange,
  dashboardGreeting,
  defaultDateTimeValue,
  dueLabel,
  firstName,
  initials,
  percentChange,
  pointsChange,
  stageMeta,
  taskPriority,
  widgetShellClass,
} from "./dashboard-format";

function task(id: string, title = "Ligar para o cliente"): Task {
  return { id, title } as Task;
}

describe("percentChange", () => {
  it("não compara contra um mês anterior zerado", () => {
    // Sem base, qualquer percentual seria infinito ou enganoso.
    expect(percentChange(500, 0)).toBeUndefined();
    expect(percentChange(500, -10)).toBeUndefined();
  });

  it("marca estabilidade em vez de mostrar +0%", () => {
    expect(percentChange(100, 100)).toBe("estável");
  });

  it("assina a direção da variação", () => {
    expect(percentChange(150, 100)).toBe("+50%");
    expect(percentChange(50, 100)).toBe("-50%");
  });
});

describe("countChange", () => {
  it("exige base anterior para comparar", () => {
    expect(countChange(4, 0)).toBeUndefined();
  });

  it("mostra a diferença absoluta com sinal", () => {
    expect(countChange(7, 4)).toBe("+3");
    expect(countChange(2, 4)).toBe("-2");
    expect(countChange(4, 4)).toBe("estável");
  });
});

describe("pointsChange", () => {
  it("usa pontos percentuais e compara mesmo sem base anterior", () => {
    // Taxa de conversão parte de 0% legitimamente, então aqui não há guarda.
    expect(pointsChange(12, 0)).toBe("+12pp");
    expect(pointsChange(8, 12)).toBe("-4pp");
    expect(pointsChange(9, 9)).toBe("estável");
  });
});

describe("dueLabel", () => {
  const now = new Date(2026, 7, 5, 9, 0, 0);

  it("chama o dia de hoje pelo nome", () => {
    const today = new Date(2026, 7, 5, 14, 30, 0);
    expect(dueLabel(today.toISOString(), now)).toBe("Hoje, 14:30");
  });

  it("chama o dia seguinte de amanhã", () => {
    const tomorrow = new Date(2026, 7, 6, 8, 15, 0);
    expect(dueLabel(tomorrow.toISOString(), now)).toBe("Amanhã, 08:15");
  });

  it("cai na data cheia para os demais dias", () => {
    const later = new Date(2026, 7, 20, 11, 0, 0);
    expect(dueLabel(later.toISOString(), now)).toContain("11:00");
    expect(dueLabel(later.toISOString(), now)).not.toContain("Hoje");
    expect(dueLabel(later.toISOString(), now)).not.toContain("Amanhã");
  });

  it("não quebra com data inválida vinda do banco", () => {
    expect(dueLabel("não é uma data", now)).toBe("Sem data");
  });
});

describe("defaultDateTimeValue", () => {
  it("sugere amanhã às 10:30 no formato do input datetime-local", () => {
    const value = defaultDateTimeValue(new Date(2026, 7, 5, 22, 47, 0));
    expect(value).toBe("2026-08-06T10:30");
  });

  it("atravessa a virada de mês", () => {
    expect(defaultDateTimeValue(new Date(2026, 7, 31, 9, 0, 0))).toBe("2026-09-01T10:30");
  });
});

describe("taskPriority", () => {
  it("trata qualquer tarefa atrasada como alta", () => {
    const atrasada = task("a");
    expect(taskPriority(atrasada, [atrasada], 5).label).toBe("Alta");
  });

  it("trata o topo da fila como alta mesmo sem atraso", () => {
    expect(taskPriority(task("b"), [], 0).label).toBe("Alta");
  });

  it("degrada para média e baixa conforme desce na fila", () => {
    expect(taskPriority(task("c"), [], 1).label).toBe("Média");
    expect(taskPriority(task("d"), [], 2).label).toBe("Baixa");
  });
});

describe("stageMeta", () => {
  const preset = getProfessionPreset("law_office");

  it("usa o rótulo da profissão para a etapa", () => {
    expect(stageMeta("novo", preset).label).toBe(preset.stages.novo?.label);
  });

  it("dá uma classe de cor para toda etapa conhecida", () => {
    for (const stage of ["novo", "em_contato", "negociacao", "ganho", "perdido"] as const) {
      expect(stageMeta(stage, preset).className).toBeTruthy();
    }
  });
});

describe("dashboardGreeting", () => {
  const preset = getProfessionPreset("autonomous_seller");

  it("no primeiro acesso ensina o caminho em vez de mostrar contagem", () => {
    const greeting = dashboardGreeting(preset, {
      overdueCount: 0,
      todayCount: 0,
      isFirstRun: true,
    });
    expect(greeting).toContain(preset.signupLabel);
    expect(greeting).toContain("cadastre um contato");
  });

  it("o atraso vence o lembrete de hoje", () => {
    // O núcleo do produto é não esquecer de chamar o cliente: o que ficou
    // para trás tem que aparecer antes do que ainda dá tempo.
    const greeting = dashboardGreeting(preset, {
      overdueCount: 3,
      todayCount: 5,
      isFirstRun: false,
    });
    expect(greeting).toContain("3 retornos atrasados");
  });

  it("concorda o singular do atraso", () => {
    const greeting = dashboardGreeting(preset, {
      overdueCount: 1,
      todayCount: 0,
      isFirstRun: false,
    });
    expect(greeting).toContain("1 retorno atrasado");
  });

  it("concorda o singular do lembrete de hoje", () => {
    const greeting = dashboardGreeting(preset, {
      overdueCount: 0,
      todayCount: 1,
      isFirstRun: false,
    });
    expect(greeting).toContain("1 lembrete para hoje");
  });

  it("cai na frase da profissão quando não há nada pendente", () => {
    const greeting = dashboardGreeting(preset, {
      overdueCount: 0,
      todayCount: 0,
      isFirstRun: false,
    });
    expect(greeting).toContain("clientes quentes");
  });
});

describe("firstName", () => {
  it("pega só o primeiro nome", () => {
    expect(firstName("  Maria Aparecida Souza ")).toBe("Maria");
  });

  it("tem um nome de exemplo para cadastro sem nome", () => {
    expect(firstName("   ")).toBe("João");
  });
});

describe("initials", () => {
  it("usa no máximo duas iniciais", () => {
    expect(initials("Maria Aparecida Souza")).toBe("MA");
  });

  it("funciona com nome único", () => {
    expect(initials("Ana")).toBe("A");
  });

  it("tem iniciais de exemplo para cadastro sem nome", () => {
    expect(initials("")).toBe("JS");
  });
});

describe("capitalize", () => {
  it("sobe a primeira letra sem mexer no resto", () => {
    expect(capitalize("negócio fechado")).toBe("Negócio fechado");
  });

  it("aguenta string vazia", () => {
    expect(capitalize("")).toBe("");
  });
});

describe("calendarToneClass", () => {
  it("dá uma cor distinta para cada tom", () => {
    const tones = ["danger", "warning", "brand"] as const;
    const classes = tones.map(calendarToneClass);
    expect(new Set(classes).size).toBe(tones.length);
  });
});

describe("widgetShellClass", () => {
  it("dá largura total aos blocos que atravessam a grade", () => {
    for (const widget of ["metrics", "onboarding", "open_claims"] as const) {
      expect(widgetShellClass(widget)).toContain("xl:col-span-12");
    }
  });

  it("dá dois terços ao gráfico e à tabela", () => {
    expect(widgetShellClass("chart")).toContain("xl:col-span-8");
    expect(widgetShellClass("deals")).toContain("xl:col-span-8");
  });

  it("deixa o resto na coluna lateral", () => {
    expect(widgetShellClass("tasks")).toContain("xl:col-span-4");
  });
});
