"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { syncOrganizationSeats } from "@/lib/billing/organization-seats";
import { organizationInvitationEmail, sendEmail } from "@/lib/integrations/email";
import { createInvitationToken } from "@/lib/crm/invitations";
import { ALL_KNOWN_JOB_ROLES } from "@/lib/people/job-roles";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { resolveOrigin } from "@/lib/utils/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { JobRole } from "@/lib/supabase/types";

async function requireOrgAdmin() {
  const supabase = await createClient();
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
  revalidatePath("/painel/equipe");
  revalidatePath("/painel/assistente");
  revalidatePath("/painel");
}

export async function inviteMember(formData: FormData) {
  const { user, orgId } = await requireOrgAdmin();
  const email = emailField(formData.get("email"));
  const jobRole = jobRoleField(formData.get("job_role"));
  if (!email) throw new Error("Informe um e-mail válido.");

  const admin = createAdminClient();
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existingProfile) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("org_id", orgId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    if (membership) throw new Error("Essa pessoa já faz parte da equipe.");
  }

  const [{ data: organization }, { data: inviterProfile }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    admin.from("profiles").select("name").eq("id", user.id).maybeSingle(),
  ]);
  if (!organization) throw new Error("Organização não encontrada.");

  const now = new Date();
  const expiresInDays = 7;
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const { token, tokenHash } = createInvitationToken();

  await admin
    .from("organization_invitations")
    .update({ revoked_at: now.toISOString() })
    .eq("org_id", orgId)
    .ilike("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const { data: invitation, error: invitationError } = await admin
    .from("organization_invitations")
    .insert({
      org_id: orgId,
      email,
      token_hash: tokenHash,
      job_role: jobRole,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (invitationError || !invitation) {
    console.error("[team/invitation-create]", invitationError);
    throw new Error("Não deu para criar o convite.");
  }

  const origin = resolveOrigin(await headers());
  const invitationUrl = `${origin}/convite?token=${encodeURIComponent(token)}`;
  const message = organizationInvitationEmail({
    organizationName: organization.name,
    inviterName: inviterProfile?.name || user.email || "Um administrador",
    invitationUrl,
    expiresInDays,
  });
  const sent = await sendEmail(email, message.subject, message.html, "human");
  if (!sent) {
    await admin.from("organization_invitations").delete().eq("id", invitation.id);
    throw new Error("O convite não foi enviado. Verifique a configuração de e-mail.");
  }

  revalidatePath("/painel/equipe");
}

export async function revokeInvitation(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();
  const invitationId = String(formData.get("invitation_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) throw new Error("Convite inválido.");

  const { error } = await supabase
    .from("organization_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (error) {
    console.error("[team/invitation-revoke]", error);
    throw new Error("Não deu para cancelar o convite.");
  }
  revalidatePath("/painel/equipe");
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
  revalidatePath("/painel/equipe");
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
  revalidatePath("/painel/equipe");
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
  await syncOrganizationSeats(orgId);
  revalidatePath("/painel/equipe");
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

