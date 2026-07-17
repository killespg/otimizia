import { describe, expect, it } from "vitest";
import { canManage, canManageCrmResource, canViewCrmResource } from "@/lib/permissions";

describe("canViewCrmResource", () => {
  it("sempre libera visualização (escopo deste v1 é só sobre gerenciar)", () => {
    expect(canViewCrmResource()).toBe(true);
  });
});

describe("canManageCrmResource", () => {
  it("admin da organização sempre pode gerenciar", () => {
    expect(
      canManageCrmResource({ isOrgAdmin: true, jobRole: "staff", userId: "u1", assigneeId: "outro", ownerId: "outro" })
    ).toBe(true);
  });

  it("cargos de gestão ampla (broker/agent/owner/etc.) gerenciam qualquer registro", () => {
    for (const jobRole of ["owner", "broker", "agent", "managing_partner", "lawyer"] as const) {
      expect(
        canManageCrmResource({ isOrgAdmin: false, jobRole, userId: "u1", assigneeId: "outro", ownerId: "outro" })
      ).toBe(true);
    }
  });

  it("cargo restrito (assistant/staff) só gerencia o que é atribuído ou de sua autoria", () => {
    expect(
      canManageCrmResource({ isOrgAdmin: false, jobRole: "assistant", userId: "u1", assigneeId: "u1", ownerId: "outro" })
    ).toBe(true);
    expect(
      canManageCrmResource({ isOrgAdmin: false, jobRole: "assistant", userId: "u1", assigneeId: null, ownerId: "u1" })
    ).toBe(true);
    expect(
      canManageCrmResource({ isOrgAdmin: false, jobRole: "assistant", userId: "u1", assigneeId: "outro", ownerId: "outro" })
    ).toBe(false);
  });

  it("sem job_role (null) segue a regra de escopo próprio", () => {
    expect(canManageCrmResource({ isOrgAdmin: false, jobRole: null, userId: "u1", assigneeId: "u1", ownerId: "outro" })).toBe(true);
    expect(canManageCrmResource({ isOrgAdmin: false, jobRole: null, userId: "u1", assigneeId: "outro", ownerId: "outro" })).toBe(false);
  });
});

describe("canManage", () => {
  it("delega pra canViewCrmResource/canManageCrmResource conforme a ação", () => {
    const params = { isOrgAdmin: false, jobRole: "staff" as const, userId: "u1", assigneeId: "outro", ownerId: "outro" };
    expect(canManage("deal", "view", params)).toBe(true);
    expect(canManage("deal", "manage", params)).toBe(false);
  });
});
