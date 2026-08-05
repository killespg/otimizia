import { describe, expect, it } from "vitest";
import {
  LIMIT,
  advanceRecurrence,
  collectDetails,
  dateTimeOrNull,
  dealPhotoPaths,
  dealPhotos,
  emailOrNull,
  emptyToNull,
  ensureOk,
  imageExtension,
  isDealStage,
  moneyToCents,
  normalizeInstagram,
  normalizeLabels,
  parseStringArray,
  percentOrNull,
  recurrenceOrNone,
  requiredText,
  safeReturnPath,
  stageFromPipelineList,
  text,
  urlOrNull,
} from "./form-values";

describe("text", () => {
  it("apara e corta no limite", () => {
    expect(text("  Maria  ", 120)).toBe("Maria");
    expect(text("abcdef", 3)).toBe("abc");
  });

  it("trata valor ausente ou arquivo como string vazia", () => {
    expect(text(null, 10)).toBe("");
    expect(text(new File([], "x.png"), 10)).toBe("");
  });
});

describe("requiredText", () => {
  it("reclama em português com o nome do campo", () => {
    expect(() => requiredText("   ", "Nome", 120)).toThrow("Nome obrigatório.");
  });

  it("passa o valor aparado quando existe", () => {
    expect(requiredText(" Contrato ", "Título", 120)).toBe("Contrato");
  });
});

describe("emptyToNull", () => {
  it("vira null em vez de string vazia, pro banco guardar null", () => {
    expect(emptyToNull("   ", 40)).toBeNull();
    expect(emptyToNull("11999998888", 40)).toBe("11999998888");
  });
});

describe("emailOrNull", () => {
  it("normaliza para minúsculo", () => {
    expect(emailOrNull("  Maria@Empresa.COM ")).toBe("maria@empresa.com");
  });

  it("aceita campo vazio — e-mail não é obrigatório", () => {
    expect(emailOrNull("")).toBeNull();
    expect(emailOrNull(null)).toBeNull();
  });

  it("rejeita endereço malformado", () => {
    expect(() => emailOrNull("maria@")).toThrow("E-mail inválido.");
    expect(() => emailOrNull("maria arroba empresa.com")).toThrow("E-mail inválido.");
    expect(() => emailOrNull("maria@empresa")).toThrow("E-mail inválido.");
  });
});

describe("normalizeLabels", () => {
  it("tira duplicata e espaço sobrando", () => {
    expect(normalizeLabels(" quente , frio ,quente ")).toBe("quente, frio");
  });

  it("descarta entrada vazia entre vírgulas", () => {
    expect(normalizeLabels("quente,,,frio")).toBe("quente, frio");
  });

  it("volta vazio quando não veio nada", () => {
    expect(normalizeLabels(null)).toBe("");
  });
});

describe("urlOrNull", () => {
  it("completa o esquema quando o usuário digita só o domínio", () => {
    expect(urlOrNull("empresa.com.br")).toBe("https://empresa.com.br/");
  });

  it("preserva http e https já digitados", () => {
    expect(urlOrNull("http://empresa.com.br")).toBe("http://empresa.com.br/");
  });

  it("recusa esquema que não seja web", () => {
    // `javascript:` viraria link executável na tela do contato.
    expect(() => urlOrNull("javascript:alert(1)")).toThrow("URL inválida.");
  });

  it("aceita campo vazio", () => {
    expect(urlOrNull("")).toBeNull();
  });
});

describe("moneyToCents", () => {
  it("lê o formato brasileiro com milhar e centavos", () => {
    expect(moneyToCents("R$ 1.234,56")).toBe(123456);
  });

  // BUG CONHECIDO, comportamento fixado aqui só para não mudar sem querer.
  // O ponto de milhar só é tratado quando existe vírgula na string. Sem
  // vírgula, "1.000" é lido como 1,00 — o usuário digita mil reais e o
  // negócio é salvo valendo um real. Corrigir exige decidir o que fazer com
  // "1.5" (um e cinquenta ou mil e quinhentos?), então fica como decisão de
  // produto, não como efeito colateral de refactor.
  it("ainda lê milhar sem vírgula como decimal", () => {
    expect(moneyToCents("1.000")).toBe(100);
    expect(moneyToCents("1.500")).toBe(150);
  });

  it("lê valor simples sem separador", () => {
    expect(moneyToCents("250")).toBe(25000);
    expect(moneyToCents("250,5")).toBe(25050);
  });

  it("campo vazio é null, não zero", () => {
    // Null significa "não informado"; zero significa "vale zero".
    expect(moneyToCents("")).toBeNull();
  });

  it("valor negativo ou sem sentido cai para zero", () => {
    expect(moneyToCents("-30")).toBe(0);
    expect(moneyToCents("abc")).toBe(0);
  });

  it("tem teto para não estourar a coluna", () => {
    expect(moneyToCents("999999999999")).toBe(99999999999);
  });
});

describe("percentOrNull", () => {
  it("aceita vírgula e o símbolo de porcentagem", () => {
    expect(percentOrNull("2,5%")).toBe(2.5);
  });

  it("limita em 100", () => {
    expect(percentOrNull("150")).toBe(100);
  });

  it("recusa negativo e texto", () => {
    expect(percentOrNull("-5")).toBeNull();
    expect(percentOrNull("abc")).toBeNull();
  });
});

describe("dateTimeOrNull", () => {
  it("converte para ISO", () => {
    expect(dateTimeOrNull("2026-08-05T10:30")).toBe(new Date("2026-08-05T10:30").toISOString());
  });

  it("data inválida vira null em vez de quebrar o insert", () => {
    expect(dateTimeOrNull("32/13/2026")).toBeNull();
    expect(dateTimeOrNull("")).toBeNull();
  });
});

describe("normalizeInstagram", () => {
  it("extrai o usuário da URL completa", () => {
    expect(normalizeInstagram("https://www.instagram.com/maria.corretora/")).toBe("maria.corretora");
  });

  it("tira o arroba", () => {
    expect(normalizeInstagram("@maria.corretora")).toBe("maria.corretora");
  });

  it("descarta query string", () => {
    expect(normalizeInstagram("https://instagram.com/maria?hl=pt")).toBe("maria");
  });

  // BUG CONHECIDO, comportamento fixado aqui. O prefixo só é removido quando
  // a URL vem com http/https; colada sem esquema, o domínio sobra e vira o
  // "usuário" salvo no contato.
  it("ainda erra quando a URL vem sem esquema", () => {
    expect(normalizeInstagram("instagram.com/maria")).toBe("instagram.com");
  });

  it("respeita o limite da coluna", () => {
    expect(normalizeInstagram("a".repeat(200))?.length).toBe(LIMIT.instagram);
  });

  it("aceita vazio", () => {
    expect(normalizeInstagram("")).toBeNull();
  });
});

describe("parseStringArray", () => {
  it("lê o JSON gravado no details", () => {
    expect(parseStringArray('["a.jpg","b.jpg"]')).toEqual(["a.jpg", "b.jpg"]);
  });

  it("aceita a lista separada por vírgula dos registros antigos", () => {
    expect(parseStringArray("a.jpg, b.jpg")).toEqual(["a.jpg", "b.jpg"]);
  });

  it("descarta entrada que não é string", () => {
    expect(parseStringArray('["a.jpg",null,3,""]')).toEqual(["a.jpg"]);
  });

  it("vazio e ausente viram lista vazia", () => {
    expect(parseStringArray(undefined)).toEqual([]);
    expect(parseStringArray("")).toEqual([]);
    expect(parseStringArray("{}")).toEqual([]);
  });
});

describe("dealPhotos / dealPhotoPaths", () => {
  it("leem as chaves certas do details", () => {
    const details = { photo_urls: '["u1"]', photo_paths: '["p1"]' };
    expect(dealPhotos(details)).toEqual(["u1"]);
    expect(dealPhotoPaths(details)).toEqual(["p1"]);
  });

  it("aguentam negócio sem details", () => {
    expect(dealPhotos(null)).toEqual([]);
    expect(dealPhotoPaths(undefined)).toEqual([]);
  });
});

describe("imageExtension", () => {
  it("prefere o content-type ao nome do arquivo", () => {
    expect(imageExtension("image/png", "foto.jpg")).toBe("png");
  });

  it("cai no nome do arquivo quando o tipo é desconhecido", () => {
    expect(imageExtension("application/octet-stream", "foto.HEIC")).toBe("heic");
  });

  it("tem padrão para arquivo sem pista nenhuma", () => {
    expect(imageExtension("", "foto")).toBe("jpg");
  });
});

describe("recurrenceOrNone", () => {
  it("aceita só as recorrências conhecidas", () => {
    expect(recurrenceOrNone("weekly")).toBe("weekly");
    expect(recurrenceOrNone("anual")).toBe("none");
    expect(recurrenceOrNone(null)).toBe("none");
  });
});

describe("advanceRecurrence", () => {
  const base = "2026-08-05T13:00:00.000Z";

  it("avança um dia, uma semana e um mês", () => {
    expect(advanceRecurrence(base, "daily")).toBe("2026-08-06T13:00:00.000Z");
    expect(advanceRecurrence(base, "weekly")).toBe("2026-08-12T13:00:00.000Z");
    expect(advanceRecurrence(base, "monthly")).toBe("2026-09-05T13:00:00.000Z");
  });

  it("parte de agora quando a tarefa não tinha data", () => {
    expect(advanceRecurrence(null, "daily")).toBeTruthy();
  });
});

describe("isDealStage", () => {
  it("reconhece as etapas do funil", () => {
    expect(isDealStage("ganho")).toBe(true);
    expect(isDealStage("etapa_inventada")).toBe(false);
  });
});

describe("stageFromPipelineList", () => {
  it("mapeia lista importada para a etapa equivalente", () => {
    expect(stageFromPipelineList("Perdidos")).toBe("perdido");
    expect(stageFromPipelineList("Fechado / Vendido")).toBe("ganho");
    expect(stageFromPipelineList("Proposta enviada")).toBe("negociacao");
    expect(stageFromPipelineList("Em contato")).toBe("em_contato");
  });

  it("ignora acento e caixa", () => {
    expect(stageFromPipelineList("NEGOCIAÇÃO")).toBe("negociacao");
    expect(stageFromPipelineList("Análise")).toBe("em_contato");
  });

  it("lista desconhecida entra como novo", () => {
    expect(stageFromPipelineList("Coluna sem nome claro")).toBe("novo");
  });
});

describe("collectDetails", () => {
  const fields = [
    { key: "bairro", label: "Bairro", type: "text" as const },
    { key: "tipo", label: "Tipo", type: "select" as const, options: ["Casa", "Apartamento"] },
  ];

  it("recolhe só os campos declarados no preset", () => {
    const form = new FormData();
    form.set("details.bairro", " Centro ");
    form.set("details.tipo", "Casa");
    form.set("details.intruso", "valor");
    expect(collectDetails(form, fields)).toEqual({ bairro: "Centro", tipo: "Casa" });
  });

  it("descarta opção fora da lista do select", () => {
    const form = new FormData();
    form.set("details.tipo", "Iate");
    expect(collectDetails(form, fields)).toEqual({});
  });

  it("ignora campo em branco", () => {
    const form = new FormData();
    form.set("details.bairro", "   ");
    expect(collectDetails(form, fields)).toEqual({});
  });
});

describe("ensureOk", () => {
  it("passa direto quando não há erro", () => {
    expect(() => ensureOk(null, "falhou")).not.toThrow();
    expect(() => ensureOk(undefined, "falhou")).not.toThrow();
  });

  it("troca o erro do banco pela mensagem que a tela mostra", () => {
    // O erro cru do Postgres não deve vazar para o usuário.
    expect(() => ensureOk({ code: "23505", message: 'duplicate key "contacts_pkey"' }, "Não deu para salvar o contato.")).toThrow(
      "Não deu para salvar o contato."
    );
  });
});

describe("safeReturnPath", () => {
  it("aceita caminho interno", () => {
    expect(safeReturnPath("/painel/contatos", "/painel")).toBe("/painel/contatos");
  });

  it("recusa host externo disfarçado de caminho", () => {
    expect(safeReturnPath("//evil.com", "/painel")).toBe("/painel");
    expect(safeReturnPath("https://evil.com", "/painel")).toBe("/painel");
    expect(safeReturnPath("/\\evil.com", "/painel")).toBe("/\\evil.com");
  });

  it("recusa qualquer coisa com esquema", () => {
    expect(safeReturnPath("/painel?next=javascript://evil", "/painel")).toBe("/painel");
  });

  it("recusa caminho relativo e valor ausente", () => {
    expect(safeReturnPath("painel/contatos", "/painel")).toBe("/painel");
    expect(safeReturnPath(null, "/painel")).toBe("/painel");
  });

  it("corta caminho absurdamente longo", () => {
    expect(safeReturnPath("/" + "a".repeat(500), "/painel").length).toBe(160);
  });
});
