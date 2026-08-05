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
    const order = [...dock.matchAll(/(?:aria-label="Falar com o Tim"|>(Início|Imóveis|WhatsApp|Mais)<)/g)].map(
      (match) => match[1] ?? "Tim",
    );

    expect(order).toEqual(["Início", "Imóveis", "Tim", "WhatsApp", "Mais"]);
  });

  it("eleva o Tim acima da barra em vez de tratá-lo como uma aba comum", () => {
    const dock = dockMarkup(renderDock());

    expect(dock).toContain("-top-3");
    expect(dock).toContain("h-14 w-14");
    expect(dock).toContain("rounded-full");
    expect(dock).toContain("border-[3px]");
  });

  it("usa o roxo da marca no botão central, não uma cor solta", () => {
    // DESIGN.md trata #8757f0 como identidade e proíbe gradiente decorativo
    // no produto: o token existe, então não há motivo para uma cor externa.
    const dock = dockMarkup(renderDock());

    expect(dock).toContain("bg-od-accent");
    expect(dock).toContain("border-od-bg");
    expect(dock).not.toMatch(/bg-indigo-\d|bg-gradient-to/);
  });

  it("continua navegando por link, não por button", () => {
    // Trocar por <button> perderia prefetch, abrir em nova aba e o botão do
    // meio do mouse — o Tim é uma rota, não uma ação local.
    const dock = dockMarkup(renderDock());

    expect(dock).toMatch(/<a\b[^>]*aria-label="Falar com o Tim"/);
    expect(dock).not.toMatch(/<button\b[^>]*aria-label="Falar com o Tim"/);
    expect(dock).toMatch(/<a\b[^>]*href="\/painel\/assistente"/);
  });

  it("dá a todo item da barra o alvo mínimo de toque", () => {
    // PRODUCT.md trata 44 px como prioridade declarada, e o layout em
    // justify-between deixa a largura seguir o texto — sem o piso, "Início"
    // ficaria abaixo do mínimo.
    const dock = dockMarkup(renderDock());
    const targets = [...dock.matchAll(/<(?:a|button)\b[^>]*class="([^"]*)"/g)].map((match) => match[1]);

    expect(targets.length).toBe(5);
    for (const className of targets) {
      const isTim = className.includes("h-14 w-14");
      expect(isTim || (className.includes("min-h-14") && className.includes("min-w-11"))).toBe(true);
    }
  });
});
