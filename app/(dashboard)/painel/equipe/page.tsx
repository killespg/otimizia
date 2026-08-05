import { redirect } from "next/navigation";
import { PendingButton } from "@/components/ui/PendingButton";
import { jobRoleLabel } from "@/lib/law/law-office";
import { jobRoleLabelRealEstate } from "@/lib/real-estate/real-estate";
import { jobRolesFor } from "@/lib/people/job-roles";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/supabase/types";
import { normalizeProfession } from "@/lib/people/professions";
import type { JobRole } from "@/lib/supabase/types";
import { IconPlus, IconTrash, IconUsers } from "../icons";
import { inviteMember, removeMember, revokeInvitation, updateMemberJobRole, updateMemberRole, updateOrganizationContext } from "./actions";

function memberJobRoleLabel(role: JobRole, professionType: string) {
  return normalizeProfession(professionType) === "real_estate_broker"
    ? jobRoleLabelRealEstate(role)
    : jobRoleLabel(role);
}

export default async function TeamPage(
  props: {
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  const [members, role, { data: orgData }, { data: invitationRows }] = await Promise.all([
    getOrgMembers(supabase, orgId),
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
    supabase
      .from("organization_invitations")
      .select("id, email, job_role, expires_at")
      .eq("org_id", orgId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);
  const org = orgData as Organization | null;
  const isAdmin = role === "admin";
  const adminCount = members.filter((m) => m.role === "admin").length;
  const isSolo = members.length <= 1;
  const selfMember = members.find((m) => m.user_id === user.id);
  const isSeller = normalizeProfession(selfMember?.profession_type) === "autonomous_seller";
  const isRealEstate = normalizeProfession(selfMember?.profession_type) === "real_estate_broker";
  const usesFlatSurface = isSeller || isRealEstate;
  const inviteJobRoles = jobRolesFor(normalizeProfession(selfMember?.profession_type));

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <header className="border-b border-white/[0.08] pb-5">
        <p className="text-xs font-semibold text-od-text-2">{isSeller ? "Vendas / Meu negócio" : isRealEstate ? "Imobiliário / Equipe" : "Escritório / Equipe"}</p>
        <h1 className="mt-2 text-od-title text-white">
          {org?.name ?? "Sua empresa"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/52">
          {isSolo
            ? isSeller
              ? "Organize aqui o contexto da sua operação. Você pode trabalhar sozinho e convidar alguém quando precisar."
              : "Você tá sozinho(a) por enquanto — dá pra usar assim numa boa, e convidar alguém quando quiser."
            : "Todo mundo aqui compartilha os mesmos contatos, vendas e lembretes."}
        </p>
      </header>

      {searchParams.error && (
        <div className="rounded-md border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-bold text-danger-700">
          {searchParams.error}
        </div>
      )}

      <SectionCard
        title={isSeller ? "Seu negócio" : isRealEstate ? "Imobiliária e assistente" : "Empresa e IA"}
        description={isSeller ? "Informações comerciais que orientam o assistente e mantêm sua operação coerente." : isRealEstate ? "Contexto da operação imobiliária usado pelo assistente e compartilhado com a equipe." : "Nome, contexto e preferências que a IA usa pra te ajudar — vale mesmo se for só você."}
        flat={usesFlatSurface}
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
        <section className={usesFlatSurface ? "space-y-3 border-y border-white/[0.08] py-5" : "space-y-3 border border-white/[0.09] bg-od-muted-surface p-5"}>
          <div>
            <h2 className="text-base font-semibold text-white">
              Convidar
            </h2>
            <p className="mt-1 text-xs text-white/52">
              A pessoa recebe um e-mail para criar a senha e entra direto na empresa.
            </p>
          </div>
          <form action={safeInvite} className="grid gap-2 sm:grid-cols-[1fr_13rem_auto]">
            <input
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder={isSeller ? "nome@empresa.com" : "email@escritorio.com"}
              className="field"
            />
            <select name="job_role" defaultValue={inviteJobRoles[0]?.value} className="field">
              {inviteJobRoles.map((item) => (
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
          {(invitationRows?.length ?? 0) > 0 ? (
            <div className="border-t border-white/[0.08] pt-3">
              <p className="text-xs font-semibold text-white/52">Aguardando aceite</p>
              <ul className="mt-2 divide-y divide-white/[0.06]">
                {invitationRows!.map((invitation) => (
                  <li key={invitation.id} className="flex min-h-11 items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">{invitation.email}</p>
                      <p className="mt-0.5 text-xs text-od-text-3">
                        {memberJobRoleLabel(invitation.job_role as JobRole, selfMember?.profession_type ?? "autonomous_seller")}
                        {" · expira em "}
                        {new Intl.DateTimeFormat("pt-BR").format(new Date(invitation.expires_at))}
                      </p>
                    </div>
                    <form action={revokeInvitation}>
                      <input type="hidden" name="invitation_id" value={invitation.id} />
                      <PendingButton
                        className="btn-secondary min-h-11"
                        pendingLabel="Cancelando"
                      >
                        Cancelar
                      </PendingButton>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      <section className={usesFlatSurface ? "overflow-hidden border-y border-white/[0.08]" : "overflow-hidden border border-white/[0.09] bg-od-muted-surface"}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <h2 className="text-base font-semibold text-white">
            Membros
          </h2>
          <span className="text-xs font-semibold text-od-text-3">
            {String(members.length).padStart(2, "0")}
          </span>
        </div>

        <ul className="px-5">
          {members.map((member) => {
            const isSelf = member.user_id === user.id;
            const isLastAdmin = member.role === "admin" && adminCount <= 1;
            return (
              <li key={member.user_id} className="flex items-center gap-3 border-b border-white/[0.06] py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-od-text-2">
                  <IconUsers className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white">
                    {member.name || "Sem nome"}
                    {isSelf && <span className="ml-1.5 font-medium text-ink-muted">(você)</span>}
                  </p>
                  <p className="mt-1 text-xs text-od-text-3">
                    {memberJobRoleLabel(member.job_role, member.profession_type)}
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
                        {jobRolesFor(normalizeProfession(member.profession_type)).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <PendingButton
                        className="press-sm rounded-md border border-line bg-od-surface px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors duration-150 ease-out hover:bg-surface-2"
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
                          className="press-sm rounded-md border border-line bg-od-surface px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors duration-150 ease-out hover:bg-surface-2"
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
    redirect(`/painel/equipe?error=${encodeURIComponent(message)}`);
  }
}

function SectionCard({
  title,
  description,
  children,
  flat = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  flat?: boolean;
}) {
  return (
    <section className={flat ? "space-y-4 border-y border-white/[0.08] py-5" : "space-y-4 border border-white/[0.09] bg-od-muted-surface p-5"}>
      <div>
        <h2 className="text-base font-semibold text-white">
          {title}
        </h2>
        <p className="mt-1 text-xs text-white/52">{description}</p>
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
