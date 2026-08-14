"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parseLegalAcquisitionCost,
} from "@/lib/law/legal-acquisition-cost";
import {
  canManageFinance,
  hasLegalWorkspace,
} from "@/lib/law/law-office";
import { createClient } from "@/lib/supabase/server";
import type { JobRole } from "@/lib/supabase/types";
import { logError } from "@/lib/utils/logger";
import { getActiveOrgId } from "@/lib/workspace/org";

export async function saveLegalAcquisitionCost(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  const [
    { data: profile, error: profileError },
    { data: membership, error: membershipError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type,profession_types,is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("role,job_role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError || membershipError) {
    logError(
      "legal-acquisition-cost.authorization",
      profileError ?? membershipError,
      { orgId, userId: user.id },
    );
    throw new Error("Não foi possível confirmar sua autorização.");
  }
  if (!membership || !profile || !hasLegalWorkspace(profile)) {
    throw new Error("Este recurso está disponível apenas no workspace de advocacia.");
  }

  const isAdmin = membership.role === "admin";
  const jobRole = membership.job_role as JobRole | null;
  if (!canManageFinance(jobRole, isAdmin)) {
    throw new Error("Seu cargo não pode gerenciar custos de aquisição.");
  }

  const input = parseLegalAcquisitionCost(formData);
  const { error } = await supabase
    .from("law_acquisition_costs")
    .upsert(
      {
        org_id: orgId,
        workspace_key: "law_office",
        month: input.month,
        marketing_cents: input.marketingCents,
        commercial_cents: input.commercialCents,
        notes: input.notes,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "org_id,workspace_key,month" },
    );

  if (error) {
    logError("legal-acquisition-cost.upsert", error, {
      orgId,
      userId: user.id,
      month: input.month,
    });
    throw new Error("Não foi possível salvar os custos de aquisição.");
  }

  revalidatePath("/painel/juridico");
}
