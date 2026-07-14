"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ALL_KNOWN_JOB_ROLES } from "@/lib/job-roles";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { JobRole } from "@/lib/supabase/types";

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

function text(v: FormDataEntryValue | null, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

function jobRoleField(v: FormDataEntryValue | null): JobRole {
  const role = typeof v === "string" ? v : "";
  return ALL_KNOWN_JOB_ROLES.some((item) => item.value === role) ? (role as JobRole) : "staff";
}

function requiredText(v: FormDataEntryValue | null, label: string, max: number): string {
  const s = text(v, max);
  if (!s) throw new Error(`${label} obrigatório.`);
  return s;
}

export async function updateOrganizationContext(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();

  const name = requiredText(formData.get("organization_name"), "Nome da empresa", 120);
  const businessContext = text(formData.get("business_context"), 1200);
  const businessPriorities = text(formData.get("business_priorities"), 1200);
  const aiTone = text(formData.get("ai_tone"), 600);
  const aiInstructions = text(formData.get("ai_instructions"), 1200);
  const industry = text(formData.get("industry"), 120);
  const region = text(formData.get("region"), 120);
  const teamSize = text(formData.get("team_size"), 60);
  const website = text(formData.get("website"), 200);
  const extraNotes = text(formData.get("extra_notes"), 1200);

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      business_context: businessContext || null,
      business_priorities: businessPriorities || null,
      ai_tone: aiTone || null,
      ai_instructions: aiInstructions || null,
      industry: industry || null,
      region: region || null,
      team_size: teamSize || null,
      website: website || null,
      extra_notes: extraNotes || null,
    })
    .eq("id", orgId);
  if (error) {
    console.error("[team/update-organization]", error);
    throw new Error("Não deu para atualizar a empresa.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/team");
  revalidatePath("/assistant");
  revalidatePath("/dashboard");
}

export async function inviteMember(formData: FormData) {
  const { orgId } = await requireOrgAdmin();
  const email = emailField(formData.get("email"));
  const jobRole = jobRoleField(formData.get("job_role"));
  if (!email) throw new Error("Informe um e-mail válido.");

  const admin = createAdminClient();
  const headersList = headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${protocol}://${host}/reset-password`,
    data: { invited_org_id: orgId, invited_job_role: jobRole },
  });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      await addExistingUserToOrg(admin, orgId, email, jobRole);
    } else {
      console.error("[team/invite]", error);
      throw new Error("Não deu para enviar o convite.");
    }
  }

  await syncSeats(orgId);
  revalidatePath("/team");
}

// Quando o e-mail já tem conta, inviteUserByEmail falha (é feito pra gente
// nova) — nesse caso adicionamos a pessoa direto na organização em vez de
// bloquear o convite.
async function addExistingUserToOrg(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  email: string,
  jobRole: JobRole
) {
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (!existing) {
    throw new Error("Esse e-mail já tem uma conta, mas não encontrei o cadastro. Tente de novo.");
  }

  const { data: membership } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", existing.id)
    .maybeSingle();
  if (membership) {
    throw new Error("Essa pessoa já faz parte da equipe.");
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ org_id: orgId, user_id: existing.id, role: "member", job_role: jobRole });
  if (memberError) {
    console.error("[team/invite-existing]", memberError);
    throw new Error("Não deu para adicionar essa pessoa à equipe.");
  }

  await admin.from("profiles").update({ active_org_id: orgId }).eq("id", existing.id);
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

export async function updateMemberJobRole(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();
  const targetUserId = String(formData.get("user_id") ?? "");
  const jobRole = jobRoleField(formData.get("job_role"));
  if (!targetUserId) throw new Error("Membro inválido.");

  const { error } = await supabase
    .from("organization_members")
    .update({ job_role: jobRole })
    .eq("org_id", orgId)
    .eq("user_id", targetUserId);
  if (error) {
    console.error("[team/update-job-role]", error);
    throw new Error("Não deu para atualizar o cargo.");
  }

  revalidatePath("/", "layout");
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
