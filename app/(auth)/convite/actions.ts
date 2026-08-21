"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncOrganizationSeats } from "@/lib/billing/organization-seats";
import { hashInvitationToken } from "@/lib/crm/invitations";
import { createClient } from "@/lib/supabase/server";

export async function acceptOrganizationInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  let tokenHash: string;
  try {
    tokenHash = hashInvitationToken(token);
  } catch {
    redirect("/convite?error=Convite inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const returnPath = `/convite?token=${encodeURIComponent(token)}`;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  const { data: orgId, error } = await supabase.rpc(
    "accept_organization_invitation",
    { p_token_hash: tokenHash }
  );
  if (error || typeof orgId !== "string") {
    const reason = error?.message ?? "";
    const message = reason.includes("email_mismatch")
      ? "Este convite foi enviado para outro e-mail."
      : "Este convite é inválido, expirou ou já foi utilizado.";
    redirect(`${returnPath}&error=${encodeURIComponent(message)}`);
  }

  await syncOrganizationSeats(orgId);
  revalidatePath("/", "layout");
  revalidatePath("/equipe");
  redirect("/painel");
}
