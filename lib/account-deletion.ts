export type OrganizationMembership = {
  org_id: string;
  user_id: string;
  role: "admin" | "member" | string;
};

export type AccountDeletionPlan = {
  organizationIds: string[];
  soleMemberOrganizationIds: string[];
  organizationsNeedingAdminTransfer: string[];
};

/**
 * Calcula todas as consequencias da exclusao antes de tocar no Stripe ou Auth.
 * A conta pode participar de varias empresas, mesmo que apenas uma esteja ativa.
 */
export function buildAccountDeletionPlan(
  userId: string,
  memberships: OrganizationMembership[],
): AccountDeletionPlan {
  const ownMemberships = memberships.filter((membership) => membership.user_id === userId);
  const organizationIds = unique(ownMemberships.map((membership) => membership.org_id));
  const soleMemberOrganizationIds: string[] = [];
  const organizationsNeedingAdminTransfer: string[] = [];

  for (const organizationId of organizationIds) {
    const organizationMembers = memberships.filter(
      (membership) => membership.org_id === organizationId,
    );
    const currentMembership = ownMemberships.find(
      (membership) => membership.org_id === organizationId,
    );
    const remainingMembers = organizationMembers.filter(
      (membership) => membership.user_id !== userId,
    );

    if (remainingMembers.length === 0) {
      soleMemberOrganizationIds.push(organizationId);
      continue;
    }

    const hasAnotherAdmin = remainingMembers.some(
      (membership) => membership.role === "admin",
    );
    if (currentMembership?.role === "admin" && !hasAnotherAdmin) {
      organizationsNeedingAdminTransfer.push(organizationId);
    }
  }

  return {
    organizationIds,
    soleMemberOrganizationIds,
    organizationsNeedingAdminTransfer,
  };
}

function unique(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}
