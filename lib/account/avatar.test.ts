import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { avatarInitials, avatarPublicUrl } from "./avatar";

describe("avatarPublicUrl", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co";
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("monta a URL pública a partir do caminho guardado no perfil", () => {
    expect(avatarPublicUrl("user-1/foto.png")).toBe(
      "https://exemplo.supabase.co/storage/v1/object/public/profile-photos/user-1/foto.png",
    );
  });

  it("não duplica a barra quando a variável termina com uma", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co/";
    expect(avatarPublicUrl("user-1/foto.png")).toContain(".co/storage/v1/");
  });

  it("devolve null para quem não tem foto", () => {
    expect(avatarPublicUrl(null)).toBeNull();
    expect(avatarPublicUrl(undefined)).toBeNull();
    expect(avatarPublicUrl("   ")).toBeNull();
  });

  it("devolve null sem a variável de ambiente, em vez de montar URL quebrada", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(avatarPublicUrl("user-1/foto.png")).toBeNull();
  });
});

describe("avatarInitials", () => {
  it("usa a primeira e a última palavra do nome", () => {
    expect(avatarInitials("Mariana Costa Andrade")).toBe("MA");
    expect(avatarInitials("Mariana Costa")).toBe("MC");
  });

  it("repete só a inicial quando há uma palavra", () => {
    expect(avatarInitials("Mariana")).toBe("M");
  });

  it("ignora espaço sobrando", () => {
    expect(avatarInitials("   Mariana    Costa   ")).toBe("MC");
  });

  it("cai no fallback quando não há nome", () => {
    expect(avatarInitials(null)).toBe("OT");
    expect(avatarInitials("")).toBe("OT");
    expect(avatarInitials("   ", "C")).toBe("C");
  });
});
