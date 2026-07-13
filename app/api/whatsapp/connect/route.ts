import { headers } from "next/headers";
import { createEvolutionInstance, EvolutionApiError } from "@/lib/evolution";
import { logError } from "@/lib/logger";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { resolveOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Cria (ou reconecta) a instância Evolution da organização e devolve o QR
// Code para o usuário escanear. Uma instância por org (unique(org_id) na
// migration 0038) — reconectar reusa o mesmo instance_name.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    return Response.json(
      { error: "Só um administrador da organização pode conectar o WhatsApp." },
      { status: 403 }
    );
  }

  const { data: existing } = await supabase
    .from("whatsapp_instances")
    .select("instance_name, status")
    .eq("org_id", orgId)
    .maybeSingle();

  const instanceName = existing?.instance_name ?? `otimizia-${orgId}`;

  let qrcodeBase64: string | null;
  try {
    const webhookUrl = `${resolveOrigin(await headers())}/api/whatsapp/webhook`;
    const result = await createEvolutionInstance(instanceName, webhookUrl);
    qrcodeBase64 = result.qrcodeBase64;
  } catch (error) {
    logError("api/whatsapp/connect", error, { orgId, instanceName });
    const message =
      error instanceof EvolutionApiError
        ? error.message
        : "Não consegui falar com o WhatsApp agora. Tente novamente em instantes.";
    return Response.json({ error: message }, { status: 502 });
  }

  const { error: upsertError } = await supabase.from("whatsapp_instances").upsert(
    {
      org_id: orgId,
      instance_name: instanceName,
      status: "pendente",
    },
    { onConflict: "org_id" }
  );
  if (upsertError) {
    logError("api/whatsapp/connect.upsert", upsertError, { orgId, instanceName });
    return Response.json({ error: "Falha ao salvar a instância." }, { status: 500 });
  }

  if (!qrcodeBase64) {
    return Response.json(
      { error: "A Evolution API não retornou um QR Code. Tente conectar novamente." },
      { status: 502 }
    );
  }

  return Response.json({ qrcode: qrcodeBase64, instanceName });
}
