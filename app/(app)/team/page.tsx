import { redirect } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { LAW_JOB_ROLES, jobRoleLabel } from "@/lib/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/supabase/types";
import { IconPlus, IconTrash, IconUsers } from "../icons";
import { inviteMember, removeMember, updateMemberJobRole, updateMemberRole, updateOrganizationContext } from "./actions";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  const [members, role, { data: orgData }] = await Promise.all([
    getOrgMembers(supabase, orgId),
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
  ]);
  const org = orgData as Organization | null;
  const isAdmin = role === "admin";
  const adminCount = members.filter((m) => m.role === "admin").length;
  const isSolo = members.length <= 1;

  return (
    <div className="max-w-2xl space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Equipe</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
          {org?.name ?? "Sua empresa"}
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
          {isSolo
            ? "Você tá sozinho(a) por enquanto — dá pra usar assim numa boa, e convidar alguém quando quiser."
            : "Todo mundo aqui compartilha os mesmos contatos, vendas e lembretes."}
        </p>
      </header>

      {searchParams.error && (
        <div className="rounded-md border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-bold text-danger-700">
          {searchParams.error}
        </div>
      )}

      <SectionCard
        title="Empresa e IA"
        description="Nome, contexto e preferências que a IA usa pra te ajudar — vale mesmo se for só você."
      >
        {isAdmin ? (
          <form action={updateOrganizationContext} className="space-y-3">
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
                placeholder="Ex.: só eu, 3 pessoas..."
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
              rows={4}
              placeholder="Qualquer outra coisa que a IA deveria saber e não se encaixa nos campos acima..."
            />
            <PendingButton className="btn-soft" pendingLabel="Salvando">
              Salvar
            </PendingButton>
          </form>
        ) : (
          <div className="space-y-3 text-sm font-medium text-ink-muted">
            <p>
              O contexto da empresa é definido por um admin e usado pela IA para
              ajudar todo mundo com a mesma direção.
            </p>
            <div className="rounded-md border border-line bg-surface px-3 py-2">
              <span className="label">Empresa/operação</span>
              <p className="mt-1 font-bold text-ink">{org?.name ?? "Empresa"}</p>
            </div>
          </div>
        )}
      </SectionCard>

      {isAdmin && (
        <section className="panel space-y-3 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
              Convidar
            </h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              A pessoa recebe um e-mail para criar a senha e entra direto na empresa.
            </p>
          </div>
          <form action={safeInvite} className="grid gap-2 sm:grid-cols-[1fr_13rem_auto]">
            <input
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder="email@escritorio.com"
              className="field"
            />
            <select name="job_role" defaultValue="lawyer" className="field">
              {LAW_JOB_ROLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <PendingButton className="btn shrink-0" pendingLabel="Enviando">
              <IconPlus className="h-4 w-4" />
              Convidar
            </PendingButton>
          </form>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Membros
          </h2>
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-black text-ink-muted">
            {String(members.length).padStart(2, "0")}
          </span>
        </div>

        <ul className="enter divide-y divide-line px-5">
          {members.map((member) => {
            const isSelf = member.user_id === user.id;
            const isLastAdmin = member.role === "admin" && adminCount <= 1;
            return (
              <li key={member.user_id} className="flex items-center gap-3 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <IconUsers className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-ink">
                    {member.name || "Sem nome"}
                    {isSelf && <span className="ml-1.5 font-medium text-ink-muted">(você)</span>}
                  </p>
                  <p className="text-xs font-bold text-ink-muted">
                    {jobRoleLabel(member.job_role)}
                    {member.role === "admin" ? " - Admin da organização" : ""}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <form action={updateMemberJobRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <select
                        name="job_role"
                        defaultValue={member.job_role}
                        className="field h-9 min-w-[12rem] py-1.5 text-xs font-bold"
                        aria-label={`Cargo de ${member.name ?? "membro"}`}
                      >
                        {LAW_JOB_ROLES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <PendingButton
                        className="press-sm rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors duration-150 ease-out hover:bg-surface-2"
                        pendingLabel="Salvando"
                      >
                        Salvar
                      </PendingButton>
                    </form>
                    {(member.role !== "admin" || !isLastAdmin) && (
                      <form action={updateMemberRole}>
                        <input type="hidden" name="user_id" value={member.user_id} />
                        <input
                          type="hidden"
                          name="role"
                          value={member.role === "admin" ? "member" : "admin"}
                        />
                        <PendingButton
                          className="press-sm rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors duration-150 ease-out hover:bg-surface-2"
                          pendingLabel="Salvando"
                        >
                          {member.role === "admin" ? "Rebaixar" : "Promover a admin"}
                        </PendingButton>
                      </form>
                    )}
                    {!isSelf && !isLastAdmin && (
                      <form action={removeMember}>
                        <input type="hidden" name="user_id" value={member.user_id} />
                        <PendingButton
                          className="icon-button grid h-9 w-9 place-items-center rounded-md text-ink-muted/60 hover:bg-danger-50 hover:text-danger-600"
                          title="Remover"
                          aria-label={`Remover ${member.name ?? "membro"}`}
                          iconOnly
                          pendingLabel="Removendo"
                        >
                          <IconTrash className="h-4 w-4" />
                        </PendingButton>
                      </form>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

async function safeInvite(formData: FormData) {
  "use server";
  try {
    await inviteMember(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não deu para enviar o convite.";
    redirect(`/team?error=${encodeURIComponent(message)}`);
  }
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel space-y-4 p-5 sm:p-6">
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
