"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parseLegalAcquisitionCost,
  type LegalAcquisitionCostActionState,
  type LegalAcquisitionCostFormValues,
} from "@/lib/law/legal-acquisition-cost";
import {
  canManageFinance,
  hasLegalWorkspace,
} from "@/lib/law/law-office";
import { createClient } from "@/lib/supabase/server";
import type { JobRole } from "@/lib/supabase/types";
import { logError } from "@/lib/utils/logger";
import { getActiveOrgId } from "@/lib/workspace/org";

function formValue(
  formData: FormData,
  name: keyof LegalAcquisitionCostFormValues,
  maxLength: number,
) {
  const value = formData.get(name);
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function submittedValues(formData: FormData): LegalAcquisitionCostFormValues {
  return {
    month: formValue(formData, "month", 16),
    marketing: formValue(formData, "marketing", 64),
    commercial: formValue(formData, "commercial", 64),
    notes: formValue(formData, "notes", 501),
  };
}

function actionState(
  previousState: LegalAcquisitionCostActionState,
  status: "success" | "error",
  message: string,
  values: LegalAcquisitionCostFormValues,
): LegalAcquisitionCostActionState {
  return {
    status,
    message,
    revision: previousState.revision + 1,
    values,
  };
}

function parserMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Confira os valores informados e tente novamente.";
}

export async function saveLegalAcquisitionCost(
  previousState: LegalAcquisitionCostActionState,
  formData: FormData,
): Promise<LegalAcquisitionCostActionState> {
  const values = submittedValues(formData);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let orgId: string;
  try {
    orgId = await getActiveOrgId(supabase, user.id);
  } catch (error) {
    logError("legal-acquisition-cost.active-org", error, { userId: user.id });
    return actionState(
      previousState,
      "error",
      "Não foi possível confirmar sua autorização.",
      values,
    );
  }

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
    return actionState(
      previousState,
      "error",
      "Não foi possível confirmar sua autorização.",
      values,
    );
  }
  if (!membership || !profile || !hasLegalWorkspace(profile)) {
    return actionState(
      previousState,
      "error",
      "Este recurso está disponível apenas no workspace de advocacia.",
      values,
    );
  }

  const isAdmin = membership.role === "admin";
  const jobRole = membership.job_role as JobRole | null;
  if (!canManageFinance(jobRole, isAdmin)) {
    return actionState(
      previousState,
      "error",
      "Seu cargo não pode gerenciar custos de aquisição.",
      values,
    );
  }

  let input;
  try {
    input = parseLegalAcquisitionCost(formData);
  } catch (error) {
    return actionState(previousState, "error", parserMessage(error), values);
  }
  let writeError: unknown;
  try {
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
    writeError = error;
  } catch (error) {
    writeError = error;
  }

  if (writeError) {
    logError("legal-acquisition-cost.upsert", writeError, {
      orgId,
      userId: user.id,
      month: input.month,
    });
    return actionState(
      previousState,
      "error",
      "Não foi possível salvar os custos de aquisição.",
      values,
    );
  }

  revalidatePath("/painel/juridico");
  return actionState(
    previousState,
    "success",
    "Custos de aquisição salvos.",
    values,
  );
}
