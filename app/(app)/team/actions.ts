"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireOrgAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") throw new Error("Só administradores gerenciam a equipe.");
  return { supabase, user, orgId };
}

function emailField(v: FormDataEntryValue | null): string {
  const email = (typeof v === "string" ? v.trim() : "").toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export async function inviteMember(formData: FormData) {
  const { orgId } = await requireOrgAdmin();
  const email = emailField(formData.get("email"));
  if (!email) throw new Error("Informe um e-mail válido.");

  const headersList = headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${protocol}://${host}/reset-password`,
    data: { invited_org_id: orgId },
  });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      throw new Error("Esse e-mail já tem uma conta no OtimizIA.");
    }
    console.error("[team/invite]", error);
    throw new Error("Não deu para enviar o convite.");
  }

  await syncSeats(orgId);
  revalidatePath("/team");
}

export async function updateMemberRole(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();
  const targetUserId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "admin" && role !== "member") throw new Error("Papel inválido.");
  if (!targetUserId) throw new Error("Membro inválido.");

  if (role === "member") {
    await ensureNotLastAdmin(supabase, orgId, targetUserId);
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", targetUserId);
  if (error) {
    console.error("[team/update-role]", error);
    throw new Error("Não deu para atualizar o papel.");
  }
  revalidatePath("/team");
}

export async function removeMember(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();
  const targetUserId = String(formData.get("user_id") ?? "");
  if (!targetUserId) throw new Error("Membro inválido.");

  await ensureNotLastAdmin(supabase, orgId, targetUserId);

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", targetUserId);
  if (error) {
    console.error("[team/remove]", error);
    throw new Error("Não deu para remover o membro.");
  }
  await syncSeats(orgId);
  revalidatePath("/team");
}

// Mantém a quantidade de seats da assinatura Stripe igual ao número de
// membros da organização. Sem efeito se a org ainda não tem assinatura ativa
// (o checkout já cobra pela quantidade atual de membros nesse caso).
async function syncSeats(orgId: string) {
  const admin = createAdminClient();
  const [{ data: org }, { count }] = await Promise.all([
    admin.from("organizations").select("stripe_subscription_id").eq("id", orgId).maybeSingle(),
    admin
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);
  if (!org?.stripe_subscription_id) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
  const item = subscription.items.data[0];
  if (!item) return;

  await stripe.subscriptions.update(org.stripe_subscription_id, {
    items: [{ id: item.id, quantity: Math.max(count ?? 1, 1) }],
  });
}

async function ensureNotLastAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  targetUserId: string
) {
  const { data: target } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (target?.role !== "admin") return;

  const { count } = await supabase
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("role", "admin");
  if ((count ?? 0) <= 1) {
    throw new Error("A empresa precisa de pelo menos um administrador.");
  }
}
