import { redirect } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { formatCPF } from "@/lib/cpf";
import { formatDate } from "@/lib/format";
import { getPlanAccess } from "@/lib/plan";
import { getProfessionPreset, PROFESSION_OPTIONS } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { updateProfession } from "../actions";
import { IconAlert, IconCheck } from "../icons";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { deleteAccount, updateEmail, updateName, updatePassword } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { checkout?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as Profile | null;

  const preset = getProfessionPreset(
    profile?.profession_type ?? user.user_metadata?.profession_type
  );
  const displayName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const access = getPlanAccess(profile);

  return (
    <div className="max-w-2xl space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Configurações</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
          Sua conta
        </h1>
      </header>

      {searchParams.checkout === "success" && (
        <div className="flex items-start gap-2 rounded-md border border-success-200 bg-success-50 px-3.5 py-3 text-sm font-bold text-success-700">
          <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Assinatura Pro ativada.
        </div>
      )}
      {searchParams.checkout === "cancel" && (
        <div className="flex items-start gap-2 rounded-md border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-bold text-danger-700">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Checkout cancelado. Nenhuma cobrança foi feita.
        </div>
      )}

      <SectionCard title="Conta" description="Dados de login e identificação.">
        <form action={updateName} className="space-y-3">
          <Field name="name" label="Nome" defaultValue={displayName} required maxLength={120} />
          <PendingButton className="btn-soft" pendingLabel="Salvando">
            Salvar nome
          </PendingButton>
        </form>

        <form action={updateEmail} className="space-y-2 border-t border-line pt-4">
          <Field
            name="email"
            label="E-mail"
            type="email"
            defaultValue={user.email ?? ""}
            required
            maxLength={160}
          />
          <Field
            id="email-current-password"
            name="current_password"
            label="Senha atual"
            type="password"
            required
            minLength={6}
            maxLength={200}
          />
          <p className="text-xs font-medium text-ink-muted">
            Você vai receber um e-mail de confirmação no endereço novo antes da troca valer.
          </p>
          <PendingButton className="btn-soft" pendingLabel="Salvando">
            Salvar e-mail
          </PendingButton>
        </form>

        <div className="border-t border-line pt-4">
          <span className="label">CPF</span>
          <p className="mt-1.5 text-sm font-bold text-ink">
            {profile?.cpf ? formatCPF(profile.cpf) : "Não informado"}
          </p>
          <p className="mt-1 text-xs font-medium text-ink-muted">
            O CPF não pode ser alterado depois do cadastro.
          </p>
        </div>

        <form action={updatePassword} className="space-y-2 border-t border-line pt-4">
          <Field
            id="password-current-password"
            name="current_password"
            label="Senha atual"
            type="password"
            required
            minLength={6}
            maxLength={200}
          />
          <Field name="password" label="Nova senha" type="password" minLength={6} maxLength={200} />
          <PendingButton className="btn-soft" pendingLabel="Salvando">
            Atualizar senha
          </PendingButton>
        </form>
      </SectionCard>

      <SectionCard title="Preferências" description="Como o app se adapta ao seu jeito de trabalhar.">
        <form action={updateProfession} className="space-y-3">
          <input type="hidden" name="return_to" value="/settings" />
          <div>
            <label className="label" htmlFor="profession-type">
              Perfil profissional
            </label>
            <select
              id="profession-type"
              name="profession_type"
              defaultValue={preset.key}
              className="field mt-1.5"
            >
              {PROFESSION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <PendingButton className="btn-soft" pendingLabel="Aplicando">
            Aplicar perfil
          </PendingButton>
        </form>
      </SectionCard>

      <SectionCard title="Plano" description="Gerencie sua assinatura.">
        {access.status === "active" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">
              Plano Pro ativo
              {profile?.current_period_end &&
                ` · renova em ${formatDate(profile.current_period_end)}`}
            </p>
            <form action="/api/billing/portal" method="POST">
              <PendingButton className="btn-soft" pendingLabel="Abrindo">
                Gerenciar assinatura
              </PendingButton>
            </form>
          </div>
        )}

        {access.status === "past_due" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-danger-700">
              Pagamento pendente — atualize a forma de pagamento para não perder o acesso.
            </p>
            <form action="/api/billing/portal" method="POST">
              <PendingButton className="btn-soft" pendingLabel="Abrindo">
                Atualizar pagamento
              </PendingButton>
            </form>
          </div>
        )}

        {access.status === "trialing" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">
              Teste grátis do Pro
              {profile?.trial_ends_at &&
                ` · termina em ${formatDate(profile.trial_ends_at)} (${access.trialDaysLeft} ${access.trialDaysLeft === 1 ? "dia" : "dias"})`}
            </p>
            <form action="/api/billing/checkout" method="POST">
              <PendingButton className="btn" pendingLabel="Abrindo">
                Assinar agora — R$ 39,90/mês
              </PendingButton>
            </form>
          </div>
        )}

        {(access.status === "free" || access.status === "expired") && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">
              {access.status === "expired"
                ? "Seu teste grátis acabou."
                : "Você está no plano Free."}
            </p>
            <form action="/api/billing/checkout" method="POST">
              <PendingButton className="btn" pendingLabel="Abrindo">
                Assinar Pro — R$ 39,90/mês
              </PendingButton>
            </form>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Zona de risco" description="Ações permanentes, sem volta." danger>
        <DeleteAccountForm action={deleteAccount} />
      </SectionCard>
    </div>
  );
}

function SectionCard({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        "panel space-y-4 p-5 sm:p-6" + (danger ? " border-danger-200" : "")
      }
    >
      <div>
        <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
          {title}
        </h2>
        <p className="mt-1 text-sm font-medium text-ink-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  minLength,
  maxLength,
}: {
  id?: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="label" htmlFor={id ?? name}>
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
        id={id ?? name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        minLength={minLength}
        maxLength={maxLength}
        className="field mt-1.5"
      />
    </div>
  );
}
