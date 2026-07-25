import { redirect } from "next/navigation";
import { BrandName } from "@/components/BrandName";
import { PendingButton } from "@/components/PendingButton";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/supabase/types";
import { completeOnboarding, skipOnboarding } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") redirect("/painel");

  const { data: orgData } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  const org = orgData as Organization | null;
  if (org?.onboarded_at) redirect("/painel");

  return (
    <main className="min-h-[100dvh] bg-[#171320] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 border-b border-white/[0.08] pb-6"><p className="text-xs font-semibold text-violet-300">Configuração inicial</p><p className="mt-2 text-sm text-white/42">Você poderá alterar tudo depois nas configurações do painel.</p></div>
        <div className="panel space-y-6 p-5 sm:p-8">
          <div>
            <p className="text-sm font-black text-ink">Bem-vindo(a) ao <BrandName /></p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink sm:text-3xl">
              Conte um pouco sobre sua empresa
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
              Isso alimenta seu assistente de IA — quanto mais contexto, mais ele ajuda do
              jeito certo desde a primeira conversa. Você pode mudar tudo depois em
              Equipe.
            </p>
          </div>

          <form action={completeOnboarding} className="space-y-4">
            <Field
              name="organization_name"
              label="Nome da empresa/operação"
              defaultValue={org?.name ?? ""}
              required
              maxLength={120}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                name="industry"
                label="Segmento/setor"
                defaultValue={org?.industry ?? ""}
                maxLength={120}
                placeholder="Ex.: imóveis, seguros, consultoria..."
              />
              <Field
                name="region"
                label="Região de atuação"
                defaultValue={org?.region ?? ""}
                maxLength={120}
                placeholder="Ex.: Ribeirão Preto e região"
              />
              <Field
                name="team_size"
                label="Tamanho da equipe"
                defaultValue={org?.team_size ?? ""}
                maxLength={60}
                placeholder="Ex.: 3 pessoas"
              />
              <Field
                name="website"
                label="Site ou link útil"
                defaultValue={org?.website ?? ""}
                maxLength={200}
                placeholder="Ex.: instagram.com/suaempresa"
              />
            </div>
            <TextAreaField
              name="business_context"
              label="Contexto da empresa"
              defaultValue={org?.business_context ?? ""}
              maxLength={1200}
              rows={4}
              placeholder="O que vende, para quem, região, diferenciais, perfil dos clientes..."
            />
            <TextAreaField
              name="business_priorities"
              label="Prioridades"
              defaultValue={org?.business_priorities ?? ""}
              maxLength={1200}
              rows={3}
              placeholder="Ex.: priorizar leads quentes, recuperar perdidos, acompanhar comissões, vender mais fazendas..."
            />
            <TextAreaField
              name="ai_tone"
              label="Jeito de falar"
              defaultValue={org?.ai_tone ?? ""}
              maxLength={600}
              rows={2}
              placeholder="Ex.: direto, informal, sem enrolar, com opinião comercial quando fizer sentido."
            />
            <TextAreaField
              name="ai_instructions"
              label="Instruções para a IA"
              defaultValue={org?.ai_instructions ?? ""}
              maxLength={1200}
              rows={4}
              placeholder="Regras internas, cuidados ao falar com clientes, informações importantes que não podem ser esquecidas..."
            />
            <TextAreaField
              name="extra_notes"
              label="Outras informações"
              defaultValue={org?.extra_notes ?? ""}
              maxLength={1200}
              rows={3}
              placeholder="Qualquer outra coisa que a IA deveria saber e não se encaixa nos campos acima..."
            />

            <div className="border-t border-line pt-5">
              <PendingButton className="btn w-full py-3 text-base" pendingLabel="Salvando">
                Continuar
              </PendingButton>
            </div>
          </form>

          <form action={skipOnboarding} className="text-center">
            <PendingButton
              className="nav-item text-sm font-bold text-ink-muted hover:text-ink"
              pendingLabel="Pulando"
            >
              Pular por agora
            </PendingButton>
          </form>
        </div>
      </div>
    </main>
  );
}

function TextAreaField({
  name,
  label,
  defaultValue,
  maxLength,
  rows = 3,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        className="field mt-1.5 min-h-24 resize-y"
      />
    </div>
  );
}

function Field({
  name,
  label,
  required = false,
  defaultValue,
  maxLength,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && (
          <>
            <span className="ml-1 text-brand-700" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> obrigatório</span>
          </>
        )}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        placeholder={placeholder}
        className="field mt-1.5"
      />
    </div>
  );
}
