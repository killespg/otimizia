"use server";

import { revalidatePath } from "next/cache";
import { requireRealEstate } from "./actions";

// RE-7xx (Fase 7): página pública do corretor. Só liga/desliga — o token
// já existe desde a migration (default gen_random_uuid()), regenerar é
// só pra revogar um link vazado.
export async function togglePublicPage(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const enabled = formData.get("enabled") === "on";
  const { error } = await supabase.from("organizations").update({ real_estate_public_page_enabled: enabled }).eq("id", orgId);
  if (error) throw new Error("Não foi possível atualizar a página pública.");
  revalidatePath("/imoveis/dashboard");
}

export async function regeneratePublicPageToken() {
  const { supabase, orgId } = await requireRealEstate();
  const { error } = await supabase.from("organizations").update({ real_estate_public_page_token: crypto.randomUUID() }).eq("id", orgId);
  if (error) throw new Error("Não foi possível gerar um novo link.");
  revalidatePath("/imoveis/dashboard");
}

