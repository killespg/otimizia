import { EvolutionApiError, getEvolutionConnectionState } from "@/lib/evolution";
import { logError } from "@/lib/logger";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Polling do frontend na tela "Conectar WhatsApp" até o status virar
// "conectado". Também é chamada pela própria tela de configurações pra
// mostrar o estado atual.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("instance_name, status, phone_number")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!instance) {
    return Response.json({ status: "nao_conectado" });
  }

  try {
    const state = await getEvolutionConnectionState(instance.instance_name);
    const status = state === "open" ? "conectado" : instance.status;
    if (status !== instance.status) {
      await supabase
        .from("whatsapp_instances")
        .update({ status })
        .eq("org_id", orgId);
    }
    return Response.json({ status, phoneNumber: instance.phone_number });
  } catch (error) {
    logError("api/whatsapp/status", error, { orgId, instanceName: instance.instance_name });
    const message =
      error instanceof EvolutionApiError
        ? error.message
        : "Não consegui checar o status da conexão agora.";
    return Response.json({ status: instance.status, error: message }, { status: 502 });
  }
}
