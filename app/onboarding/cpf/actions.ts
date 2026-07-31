"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidCPF, onlyDigits } from "@/lib/utils/cpf";
import { safeInternalPath } from "@/lib/crm/invitations";
import { normalizeProfession, type ProfessionType } from "@/lib/people/professions";
import { createClient } from "@/lib/supabase/server";

export async function submitCpf(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nextPath = safeInternalPath(formData.get("next"));
  const cpfPath = `/onboarding/cpf?next=${encodeURIComponent(nextPath)}`;
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const professionTypes = professionTypeFields(formData);

  if (!isValidCPF(cpf)) {
    redirectWithError(cpfPath, "CPF inválido.");
  }

  // `cpf`/`profession_type`/`terms_accepted_at` estão fora do update direto
  // que o cliente autenticado normal tem (0072_explicit_api_table_grants) —
  // por isso a RPC, o mesmo caminho que o callback do OAuth usa.
  const { error } = await supabase.rpc("complete_oauth_profile", {
    p_cpf: cpf,
    p_profession_types: professionTypes,
  });
  if (error) {
    const message = (error.message ?? "").toLowerCase();
    const friendly =
      message.includes("cpf") || message.includes("profiles_cpf_unique")
        ? "Esse CPF já está cadastrado."
        : "Não foi possível salvar. Tente de novo.";
    redirectWithError(cpfPath, friendly);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

function professionTypeFields(formData: FormData): ProfessionType[] {
  const selected = formData
    .getAll("profession_types")
    .map((value) => normalizeProfession(value))
    .filter((value, index, arr) => arr.indexOf(value) === index);

  return selected.length > 0 ? selected : ["autonomous_seller"];
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}
