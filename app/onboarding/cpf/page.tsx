import { redirect } from "next/navigation";
import { BrandName } from "@/components/design-system/BrandName";
import { PendingButton } from "@/components/ui/PendingButton";
import { safeInternalPath } from "@/lib/crm/invitations";
import { PROFESSION_OPTIONS } from "@/lib/people/professions";
import { createClient } from "@/lib/supabase/server";
import { AuthField } from "@/app/(auth)/AuthShell";
import { submitCpf } from "./actions";

/**
 * Passo obrigatório pra quem entra pelo Google. O OAuth não tem como pedir
 * campo extra no consentimento do provedor, então o CPF fica pendente até
 * aqui — o middleware (`lib/supabase/middleware.ts`) redireciona qualquer
 * rota protegida pra esta página enquanto `profiles.cpf` estiver vazio.
 *
 * Quem já tem CPF (cadastro por senha, ou quem já passou por aqui antes)
 * nunca vê esta tela: o middleware nem deixa chegar.
 *
 * A moldura segue o AuthShell neutro para manter continuidade depois do OAuth.
 */
export default async function CpfOnboardingPage(props: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nextPath = safeInternalPath(searchParams.next);

  const { data: profile } = await supabase
    .from("profiles")
    .select("cpf")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.cpf) redirect(nextPath);

  return (
    <main className="min-h-[100dvh] bg-od-bg p-0 sm:grid sm:place-items-center sm:p-5">
      <div className="mx-auto w-full max-w-md overflow-hidden border-od-border bg-od-surface p-6 sm:rounded-panel sm:border sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-od-text-3">
          Só mais um passo
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-od-text">
          Confirme seu CPF
        </h1>
        <p className="mt-2 text-sm leading-6 text-od-text-2">
          Como você entrou com o Google, ainda precisamos do seu CPF e da sua
          área de atuação para liberar o restante do <BrandName />.
        </p>

        {searchParams.error ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded border border-danger-200 bg-danger-50 p-3 text-sm text-danger-600"
          >
            {searchParams.error}
          </div>
        ) : null}

        <form action={submitCpf} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <AuthField
            name="cpf"
            label="CPF"
            required
            inputMode="numeric"
            maxLength={14}
            placeholder="000.000.000-00"
            autoComplete="off"
          />
          <fieldset className="space-y-2">
            <legend className="label">Em quais áreas você atua?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROFESSION_OPTIONS.map((option, index) => (
                <label
                  key={option.value}
                  className="flex min-h-11 items-center gap-2.5 rounded-inner border border-od-border bg-od-muted-surface px-3 py-2 text-sm font-medium text-od-text-2 hover:border-od-border-hover"
                >
                  <input
                    type="checkbox"
                    name="profession_types"
                    value={option.value}
                    defaultChecked={index === 0}
                    className="h-4 w-4 shrink-0 rounded border-od-border text-od-accent focus:ring-od-accent"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <PendingButton className="btn w-full py-3 text-base" pendingLabel="Salvando">
            Continuar
          </PendingButton>
        </form>
      </div>
    </main>
  );
}
