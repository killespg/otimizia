import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobRole } from "@/lib/supabase/types";

export type OrgRole = "admin" | "member";

export type OrgMember = {
  user_id: string;
  role: OrgRole;
  job_role: JobRole;
  name: string | null;
};

// Resolve a organização ativa do usuário: usa profiles.active_org_id se ele
// ainda for membro dela, senão cai para a organização mais antiga (a
// pessoal, criada no cadastro) e persiste essa escolha.
export async function getActiveOrgId(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.active_org_id) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("org_id", profile.active_org_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (membership) return membership.org_id as string;
  }

  const { data: fallback } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!fallback) {
    throw new Error("Usuário sem organização.");
  }

  await supabase
    .from("profiles")
    .update({ active_org_id: fallback.org_id })
    .eq("id", userId);

  return fallback.org_id as string;
}

export async function getOrgRole(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<OrgRole | null> {
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as OrgRole | undefined) ?? null;
}

export async function getOrgMembers(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgMember[]> {
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, role, job_role, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const rows = members ?? [];
  const ids = rows.map((m) => m.user_id as string);
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", ids);

  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, p.name as string | null]));

  return rows.map((m) => ({
    user_id: m.user_id as string,
    role: m.role as OrgRole,
    job_role: (m.job_role as JobRole | null) ?? "staff",
    name: nameById.get(m.user_id as string) ?? null,
  }));
}
