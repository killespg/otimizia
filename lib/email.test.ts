import { describe, expect, it } from "vitest";
import { contactMessageEmail } from "@/lib/email";

describe("contactMessageEmail", () => {
  it("escapa HTML no corpo e no nome do remetente", () => {
    const html = contactMessageEmail("Oi <b>cliente</b>!", "Corretor & Cia");
    expect(html).toContain("&lt;b&gt;cliente&lt;/b&gt;");
    expect(html).toContain("Corretor &amp; Cia");
    expect(html).not.toContain("<b>cliente</b>");
  });

  it("quebra o corpo em parágrafos por linha e ignora linhas em branco", () => {
    const html = contactMessageEmail("Primeira linha\n\nSegunda linha", "Ana");
    const paragraphCount = (html.match(/<p style="font-size:15px/g) ?? []).length;
    expect(paragraphCount).toEqual(2);
  });

  it("inclui uma menção a opt-out mediado por resposta", () => {
    const html = contactMessageEmail("Mensagem", "Ana");
    expect(html).toContain("não receber mais e-mails");
  });
});
