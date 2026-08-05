import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Building2, CircleGauge, MessageCircle, Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/painel",
  useRouter: () => ({ push: vi.fn() }),
}));

import { MobileAppNav, type MobileNavItem } from "@/components/design-system/mobile-app-nav";

const inicio: MobileNavItem = { href: "/painel", label: "Início", icon: CircleGauge, exact: true };
const imoveis: MobileNavItem = { href: "/painel/imoveis", label: "Imóveis", icon: Building2 };
const whatsapp: MobileNavItem = { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle };

function renderDock() {
  return renderToStaticMarkup(
    createElement(MobileAppNav, {
      tabs: [inicio, imoveis, whatsapp] as [MobileNavItem, MobileNavItem, MobileNavItem],
      timHref: "/painel/assistente",
      groups: [{ label: "Gestão", items: [{ href: "/painel/equipe", label: "Equipe", icon: Users }] }],
      ariaLabel: "Navegação no celular",
    }),
  );
}

/** Só o conteúdo da <nav data-mobile-nav>, sem o sheet que vem antes dela. */
function dockMarkup(html: string) {
  const start = html.indexOf("<nav data-mobile-nav");
  expect(start).toBeGreaterThan(-1);
  return html.slice(start, html.indexOf("</nav>", start));
}

describe("Barra de navegação do celular", () => {
  it("mantém a ordem acordada, com o Tim no centro", () => {
    // A ordem é decisão de produto e já foi trocada por engano uma vez: o Tim
    // é a âncora central da barra e o menu de áreas fecha a fila à direita.
    const dock = dockMarkup(renderDock());
    const order = [...dock.matchAll(/(?:aria-label="Falar por voz com o Tim"|>(Início|Imóveis|WhatsApp|Mais)<)/g)].map(
      (match) => match[1] ?? "Tim",
    );

    expect(order).toEqual(["Início", "Imóveis", "Tim", "WhatsApp", "Mais"]);
  });

  it("eleva o Tim acima da barra em vez de tratá-lo como uma aba comum", () => {
    // `-top-3` e não `-top-6`: a elevação maior invadia o conteúdo acima e foi
    // corrigida por decisão de produto. Fica travado para não voltar sozinho.
    const dock = dockMarkup(renderDock());

    expect(dock).toContain("-top-3");
    expect(dock).not.toContain("-top-6");
    expect(dock).toContain("h-16 w-16");
    expect(dock).toContain("rounded-full");
  });

  it("mantém o anel do botão central preso ao token do canvas", () => {
    // O recorte no vidro só funciona se o anel for exatamente a cor do fundo.
    // Hardcodar o hex faz o botão descolar do canvas na primeira mudança de
    // tema — por isso o teste exige o token, não um valor literal.
    const dock = dockMarkup(renderDock());

    expect(dock).toContain("ring-od-bg");
    expect(dock).not.toMatch(/ring-\[#[0-9a-fA-F]{6}\]/);
  });

  it("abre a conversa por voz em vez de navegar", () => {
    // O botão central deixou de ser rota: ele aciona a folha de voz ali mesmo.
    // A conversa completa continua alcançável pelo menu de áreas e por um
    // atalho dentro da própria folha, então a página do Tim não fica órfã.
    const dock = dockMarkup(renderDock());

    expect(dock).toMatch(/<button\b[^>]*aria-label="Falar por voz com o Tim"/);
    expect(dock).toContain('aria-controls="tim-voice-sheet"');
    expect(dock).toContain('aria-haspopup="dialog"');
    expect(dock).not.toMatch(/<a\b[^>]*href="\/painel\/assistente"/);
  });

  it("dá a todo item da barra o alvo mínimo de toque", () => {
    // PRODUCT.md trata 44 px como prioridade declarada, e o layout em
    // justify-between deixa a largura seguir o texto — sem o piso, "Início"
    // ficaria abaixo do mínimo.
    const dock = dockMarkup(renderDock());
    const targets = [...dock.matchAll(/<(?:a|button)\b[^>]*class="([^"]*)"/g)].map((match) => match[1]);

    expect(targets.length).toBe(5);
    for (const className of targets) {
      const isTim = className.includes("h-16 w-16");
      expect(isTim || (className.includes("min-h-14") && className.includes("min-w-11"))).toBe(true);
    }
  });
});
