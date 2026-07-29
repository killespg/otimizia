import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Exportação de dados pessoais (LGPD): tudo que essa conta específica criou
// (owner_id = usuário), não o dado compartilhado da organização inteira —
// isso roda com o client autenticado normal (respeita RLS), com o filtro
// extra por owner_id para não misturar com o que colegas de organização
// registraram.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);

  const [profile, contacts, deals, tasks, interactions] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("contacts").select("*").eq("owner_id", user.id),
    supabase.from("deals").select("*").eq("owner_id", user.id),
    supabase.from("tasks").select("*").eq("owner_id", user.id),
    supabase.from("interactions").select("*").eq("owner_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      organization_id: orgId,
      organization_role: role,
    },
    profile: profile.data,
    contacts: contacts.data ?? [],
    deals: deals.data ?? [],
    tasks: tasks.data ?? [],
    interactions: interactions.data ?? [],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-otimizia.json"',
      "Cache-Control": "no-store",
    },
  });
}
