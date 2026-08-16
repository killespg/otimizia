import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A tela do Tim nasceu antes do design system atual e carregava cores cruas
// (inclusive um roxo que não existe em nenhum outro lugar do produto), raios
// soltos do Tailwind e botões abaixo dos 44px. Depois da migração, este
// contrato é o que impede a superfície de voltar a divergir.
const timFiles = readdirSync(resolve(process.cwd(), "components/tim"))
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => resolve(process.cwd(), "components/tim", name));

const read = (file: string) => readFileSync(file, "utf8");

describe("tim surface contract", () => {
  it("não usa cor crua fora dos tokens", () => {
    const offenders = timFiles.filter((file) => /#[0-9a-fA-F]{3,8}\b/.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it("usa apenas os raios do sistema", () => {
    // `rounded-full` continua válido para avatares e pontos de status.
    const looseRadius = /rounded(-[trbl][lr])?(?![-[])|rounded-(sm|md|lg|xl|2xl|3xl)\b/;
    const offenders = timFiles.filter((file) => looseRadius.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it("mantém o alvo mínimo de toque de 44px nos controles", () => {
    const smallTarget = /\b(min-h-(?:6|7|8|9|10)|h-(?:6|8|9|10) w-(?:6|8|9|10)|size-(?:6|8|9|10))\b/;
    const offenders = timFiles
      .filter((file) => !file.endsWith("TimAvatar.tsx"))
      .filter((file) => smallTarget.test(read(file)));
    expect(offenders).toEqual([]);
  });
});
