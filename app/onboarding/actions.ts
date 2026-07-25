"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

async function requireOrgAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") redirect("/painel");
  return { supabase, orgId };
}

export async function completeOnboarding(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();

  const name = requiredText(formData.get("organization_name"), "Nome da empresa", 120);
  const industry = text(formData.get("industry"), 120);
  const region = text(formData.get("region"), 120);
  const teamSize = text(formData.get("team_size"), 60);
  const website = text(formData.get("website"), 200);
  const businessContext = text(formData.get("business_context"), 1200);
  const businessPriorities = text(formData.get("business_priorities"), 1200);
  const aiTone = text(formData.get("ai_tone"), 600);
  const aiInstructions = text(formData.get("ai_instructions"), 1200);
  const extraNotes = text(formData.get("extra_notes"), 1200);

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      industry: industry || null,
      region: region || null,
      team_size: teamSize || null,
      website: website || null,
      business_context: businessContext || null,
      business_priorities: businessPriorities || null,
      ai_tone: aiTone || null,
      ai_instructions: aiInstructions || null,
      extra_notes: extraNotes || null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", orgId);
  if (error) {
    console.error(error);
    throw new Error("Não deu para salvar a empresa.");
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}

export async function skipOnboarding() {
  const { supabase, orgId } = await requireOrgAdmin();

  const { error } = await supabase
    .from("organizations")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", orgId);
  if (error) {
    console.error(error);
    throw new Error("Não deu para continuar.");
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}

function text(v: FormDataEntryValue | null, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

function requiredText(v: FormDataEntryValue | null, label: string, max: number): string {
  const s = text(v, max);
  if (!s) throw new Error(`${label} obrigatório.`);
  return s;
}

