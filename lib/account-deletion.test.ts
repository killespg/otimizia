import { describe, expect, it } from "vitest";
import { buildAccountDeletionPlan, type OrganizationMembership } from "./account-deletion";

const userId = "user-a";

describe("buildAccountDeletionPlan", () => {
  it("inclui todas as organizacoes pessoais, nao apenas a ativa", () => {
    const memberships: OrganizationMembership[] = [
      { org_id: "personal-a", user_id: userId, role: "admin" },
      { org_id: "personal-b", user_id: userId, role: "admin" },
    ];

    expect(buildAccountDeletionPlan(userId, memberships)).toEqual({
      organizationIds: ["personal-a", "personal-b"],
      soleMemberOrganizationIds: ["personal-a", "personal-b"],
      organizationsNeedingAdminTransfer: [],
    });
  });

  it("permite sair quando outra pessoa continua administrando", () => {
    const memberships: OrganizationMembership[] = [
      { org_id: "team", user_id: userId, role: "admin" },
      { org_id: "team", user_id: "user-b", role: "admin" },
      { org_id: "team", user_id: "user-c", role: "member" },
    ];

    expect(buildAccountDeletionPlan(userId, memberships)).toEqual({
      organizationIds: ["team"],
      soleMemberOrganizationIds: [],
      organizationsNeedingAdminTransfer: [],
    });
  });

  it("bloqueia a exclusao quando deixaria uma equipe sem administrador", () => {
    const memberships: OrganizationMembership[] = [
      { org_id: "team", user_id: userId, role: "admin" },
      { org_id: "team", user_id: "user-b", role: "member" },
    ];

    expect(
      buildAccountDeletionPlan(userId, memberships).organizationsNeedingAdminTransfer,
    ).toEqual(["team"]);
  });

  it("permite que um membro comum saia sem alterar o billing da equipe", () => {
    const memberships: OrganizationMembership[] = [
      { org_id: "team", user_id: userId, role: "member" },
      { org_id: "team", user_id: "user-b", role: "admin" },
    ];

    expect(buildAccountDeletionPlan(userId, memberships)).toEqual({
      organizationIds: ["team"],
      soleMemberOrganizationIds: [],
      organizationsNeedingAdminTransfer: [],
    });
  });
});
