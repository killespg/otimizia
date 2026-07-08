import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { formatCPF } from "@/lib/cpf";
import { formatDate } from "@/lib/format";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getPlanAccess } from "@/lib/plan";
import { getProfessionPreset, PROFESSION_OPTIONS } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { updateProfessionTypes } from "../actions";
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

  const orgId = await getActiveOrgId(supabase, user.id);
  const [{ data: profileData }, { data: orgData }, role] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
    getOrgRole(supabase, orgId, user.id),
  ]);
  const profile = profileData as Profile | null;
  const org = orgData as Organization | null;
  const isOrgAdmin = role === "admin";

  const isFounder = profile?.is_admin ?? false;
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    isFounder
  );
  const preset = getProfessionPreset(workspaceKey);
  const displayName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const access = getPlanAccess(org);

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

      <Link
        href="/team"
        className="row-link flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm font-bold text-ink-soft hover:border-brand-400 hover:text-brand-700"
      >
        Nome da empresa, contexto e preferências da IA agora ficam em Equipe
        <span aria-hidden="true">→</span>
      </Link>

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

      {isFounder ? (
        <SectionCard title="Perfil" description="Sua conta usa o modo fundador do OtimizIA.">
          <p className="text-sm font-medium text-ink-muted">
            Sua conta é especial: em vez de escolher uma área de atuação, o painel
            já vem pronto para acompanhar sua própria prospecção de clientes e as
            métricas do produto.
          </p>
        </SectionCard>
      ) : isOrgAdmin ? (
        <SectionCard title="Áreas de atuação" description="Escolha qual operação quer ver e alimentar agora.">
          <form action={updateProfessionTypes} className="space-y-3">
            <input type="hidden" name="active_profession_type" value={preset.key} />
            <div className="grid gap-2 sm:grid-cols-2">
              {PROFESSION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink-soft"
                >
                  <input
                    type="checkbox"
                    name="profession_types"
                    value={option.value}
                    defaultChecked={(profile?.profession_types ?? [preset.key]).includes(option.value)}
                    className="h-4 w-4 shrink-0 rounded border-line text-brand-700 focus:ring-brand-600"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs font-medium leading-relaxed text-ink-muted">
              Contatos, negócios, lembretes e assistente ficam separados por área.
            </p>
            <PendingButton className="btn-soft" pendingLabel="Aplicando">
              Salvar áreas
            </PendingButton>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Perfil profissional" description="Definido pelo plano da sua empresa.">
          <p className="text-sm font-bold text-ink">{preset.signupLabel}</p>
          <p className="mt-2 text-xs font-medium leading-relaxed text-ink-muted">
            Sua conta usa o plano da empresa e fica limitada a esta área. Para acessar outras, é
            preciso um plano próprio.
          </p>
        </SectionCard>
      )}

      <SectionCard
        title="Plano"
        description={
          isOrgAdmin
            ? "Assinatura da empresa — R$ 39,90/mês (dono) + R$ 10/mês por pessoa extra na equipe."
            : "Assinatura gerenciada por um admin da empresa."
        }
      >
        {!isOrgAdmin && (
          <p className="text-sm font-medium text-ink-muted">
            {access.hasAccess
              ? "Sua conta está com acesso ativo pela assinatura da empresa."
              : "O acesso da empresa expirou. Peça a um admin para renovar a assinatura."}
          </p>
        )}

        {isOrgAdmin && access.status === "active" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">
              Plano Pro ativo
              {org?.current_period_end &&
                ` · renova em ${formatDate(org.current_period_end)}`}
            </p>
            <form action="/api/billing/portal" method="POST">
              <PendingButton className="btn-soft" pendingLabel="Abrindo">
                Gerenciar assinatura
              </PendingButton>
            </form>
          </div>
        )}

        {isOrgAdmin && access.status === "past_due" && (
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

        {isOrgAdmin && access.status === "trialing" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">
              Teste grátis do Pro
              {org?.trial_ends_at &&
                ` · termina em ${formatDate(org.trial_ends_at)} (${access.trialDaysLeft} ${access.trialDaysLeft === 1 ? "dia" : "dias"})`}
            </p>
            <form action="/api/billing/checkout" method="POST">
              <PendingButton className="btn" pendingLabel="Abrindo">
                Assinar agora — R$ 39,90/mês + R$ 10 por pessoa extra
              </PendingButton>
            </form>
          </div>
        )}

        {isOrgAdmin && (access.status === "free" || access.status === "expired") && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">
              {access.status === "expired"
                ? "Seu teste grátis acabou."
                : "Você está no plano Free."}
            </p>
            <form action="/api/billing/checkout" method="POST">
              <PendingButton className="btn" pendingLabel="Abrindo">
                Assinar Pro — R$ 39,90/mês + R$ 10 por pessoa extra
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
  placeholder,
}: {
  id?: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
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
        placeholder={placeholder}
        className="field mt-1.5"
      />
    </div>
  );
}
