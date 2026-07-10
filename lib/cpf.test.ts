import { describe, expect, it } from "vitest";
import { formatCPF, isValidCPF, onlyDigits } from "./cpf";

describe("onlyDigits", () => {
  it("strips non-digit characters", () => {
    expect(onlyDigits("111.444.777-35")).toBe("11144477735");
  });
});

describe("isValidCPF", () => {
  it("accepts a valid CPF", () => {
    expect(isValidCPF("111.444.777-35")).toBe(true);
    expect(isValidCPF("11144477735")).toBe(true);
  });

  it("rejects a CPF with a bad check digit", () => {
    expect(isValidCPF("123.456.789-00")).toBe(false);
  });

  it("rejects all-repeated-digit CPFs", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(isValidCPF("123")).toBe(false);
  });
});

describe("formatCPF", () => {
  it("formats digits as ###.###.###-##", () => {
    expect(formatCPF("11144477735")).toBe("111.444.777-35");
  });

  it("formats partial input progressively", () => {
    expect(formatCPF("111444")).toBe("111.444");
    expect(formatCPF("111")).toBe("111");
  });

  it("truncates input beyond 11 digits", () => {
    expect(formatCPF("111444777359999")).toBe("111.444.777-35");
  });
});
