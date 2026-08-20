import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, IconButton } from "./button";
import { Input } from "./form-controls";
import { MetricBand, Status } from "./data-display";
import { DataPanel, FormPanel, InsetGroup, Page, PageHeader, Surface } from "./surface";

describe("accessible UI primitives", () => {
  it("renders deterministic button intent and native semantics", () => {
    const html = renderToStaticMarkup(
      createElement(Button, { intent: "primary" }, "Salvar"),
    );

    expect(html).toContain('type="button"');
    expect(html).toContain("ui-button--primary");
    expect(html).toContain("Salvar");
  });

  it("requires an accessible icon-button label in rendered markup", () => {
    const html = renderToStaticMarkup(
      createElement(IconButton, { label: "Fechar" }, "×"),
    );

    expect(html).toContain('aria-label="Fechar"');
    expect(html).toContain("ui-icon-button");
  });

  it("connects labels, descriptions and validation errors", () => {
    const html = renderToStaticMarkup(
      createElement(Input, {
        id: "email",
        label: "E-mail",
        description: "Use seu endereço profissional.",
        error: "Informe um e-mail válido.",
      }),
    );

    expect(html).toContain('for="email"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("email-description");
    expect(html).toContain("email-error");
  });

  it("uses semantic structures for surfaces, metrics and statuses", () => {
    const surface = renderToStaticMarkup(
      createElement(Surface, { as: "section" }, "Conteúdo"),
    );
    const metrics = renderToStaticMarkup(
      createElement(MetricBand, {
        items: [
          { label: "Conversão", value: "24,8%", detail: "+3,1 pontos" },
          { label: "Atrasados", value: 3, tone: "danger" },
          { label: "Hoje", value: 2, href: "/painel/juridico/prazos?month=2026-08&dia=18", current: true },
        ],
      }),
    );
    const status = renderToStaticMarkup(
      createElement(Status, { intent: "success" }, "Concluído"),
    );

    expect(surface).toContain("<section");
    expect(surface).toContain('data-ui="surface"');
    expect(metrics).toContain("<dl");
    expect(metrics).toContain("24,8%");
    expect(metrics).toContain("ui-metric--danger");
    expect(metrics).toContain("ui-metric--current");
    expect(metrics).toContain('aria-current="true"');
    expect(metrics).toContain("/painel/juridico/prazos?month=2026-08&amp;dia=18");
    expect(status).toContain("ui-status--success");
    expect(status).toContain("Concluído");
  });

  it("renders the shared product page and panel vocabulary", () => {
    const page = renderToStaticMarkup(
      createElement(Page, null, "Conteúdo"),
    );
    const header = renderToStaticMarkup(
      createElement(PageHeader, {
        eyebrow: "Jurídico",
        title: "Agenda e prazos",
        description: "Fila cronológica do escritório.",
        actions: createElement("button", null, "Adicionar"),
      }),
    );
    const dataPanel = renderToStaticMarkup(
      createElement(DataPanel, { title: "Atrasados", count: 1 }, "Linha"),
    );
    const formPanel = renderToStaticMarkup(
      createElement(FormPanel, { title: "Cadastro" }, "Campos"),
    );
    const inset = renderToStaticMarkup(
      createElement(InsetGroup, null, "Filtros"),
    );

    expect(page).toContain('data-ui="page"');
    expect(header).toContain('data-ui="page-header"');
    expect(header).toContain("Fila cronológica do escritório.");
    expect(dataPanel).toContain('data-ui="data-panel"');
    expect(dataPanel).toContain("Atrasados");
    expect(dataPanel).toContain('data-count="1"');
    expect(formPanel).toContain('data-ui="form-panel"');
    expect(inset).toContain('data-ui="inset-group"');
  });
});
