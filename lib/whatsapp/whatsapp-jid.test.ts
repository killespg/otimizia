import { describe, expect, it } from "vitest";
import { extractInboundMedia } from "./whatsapp-jid";

describe("extractInboundMedia", () => {
  it("reconhece imagem com legenda", () => {
    expect(
      extractInboundMedia({
        imageMessage: { mimetype: "image/jpeg", caption: "Fachada do apê" },
      }),
    ).toEqual({ kind: "image", mimetype: "image/jpeg", caption: "Fachada do apê" });
  });

  it("normaliza o mimetype de nota de voz (com codec) pro tipo aceito", () => {
    expect(
      extractInboundMedia({
        audioMessage: { mimetype: "audio/ogg; codecs=opus" },
      }),
    ).toEqual({ kind: "audio", mimetype: "audio/ogg", caption: null });
  });

  it("usa o nome do arquivo como legenda de documento quando não há caption", () => {
    expect(
      extractInboundMedia({
        documentMessage: { mimetype: "application/pdf", fileName: "contrato.pdf" },
      }),
    ).toEqual({ kind: "document", mimetype: "application/pdf", caption: "contrato.pdf" });
  });

  it("ignora tipo de mídia fora da lista suportada", () => {
    expect(extractInboundMedia({ videoMessage: { mimetype: "video/mp4" } })).toBeNull();
    expect(extractInboundMedia({ documentMessage: { mimetype: "application/zip" } })).toBeNull();
  });

  it("retorna null pra mensagem sem mídia reconhecível", () => {
    expect(extractInboundMedia({ conversation: "oi" })).toBeNull();
    expect(extractInboundMedia(null)).toBeNull();
  });
});
