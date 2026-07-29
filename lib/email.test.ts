import { describe, expect, it } from "vitest";
import { isDeliverableAddress } from "./email";

describe("isDeliverableAddress", () => {
  it("aceita os endereços que já recebem e-mail em produção", () => {
    expect(isDeliverableAddress("killesvenancio@gmail.com")).toBe(true);
    expect(isDeliverableAddress("funcionaria.escritorio@otimizia-teste.dev")).toBe(true);
    expect(isDeliverableAddress("corretor.teste@useotimizia.com")).toBe(true);
    expect(isDeliverableAddress("manukilles@hotmail.com")).toBe(true);
  });

  it("descarta domínio sem TLD, que é o caso que o Resend recusou com 422", () => {
    expect(isDeliverableAddress("corretor@corretor")).toBe(false);
  });

  it("descarta endereço sem as duas partes", () => {
    expect(isDeliverableAddress("")).toBe(false);
    expect(isDeliverableAddress("   ")).toBe(false);
    expect(isDeliverableAddress("semarroba.com")).toBe(false);
    expect(isDeliverableAddress("@dominio.com")).toBe(false);
    expect(isDeliverableAddress("pessoa@")).toBe(false);
  });

  it("descarta domínio com ponto fora do lugar", () => {
    expect(isDeliverableAddress("pessoa@.com")).toBe(false);
    expect(isDeliverableAddress("pessoa@dominio.")).toBe(false);
    expect(isDeliverableAddress("pessoa@dominio..com")).toBe(false);
  });

  it("descarta o que quebraria o cabeçalho ou viraria segundo destinatário", () => {
    expect(isDeliverableAddress("pessoa@dominio.com, outra@dominio.com")).toBe(false);
    expect(isDeliverableAddress("pessoa@dominio.com; outra@dominio.com")).toBe(false);
    expect(isDeliverableAddress("Nome <pessoa@dominio.com>")).toBe(false);
    expect(isDeliverableAddress("pessoa @dominio.com")).toBe(false);
  });

  it("ignora espaço em volta, que é o que sobra de copiar e colar", () => {
    expect(isDeliverableAddress("  pessoa@dominio.com  ")).toBe(true);
  });
});
