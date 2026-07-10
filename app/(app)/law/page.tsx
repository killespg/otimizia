import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { canManageLegal, canViewLegal, LEGAL_CASE_STATUS } from "@/lib/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, LegalCase } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconAlert, IconColumns, IconPlus, IconUsers, IconWallet } from "../icons";
import { createLegalCase } from "./actions";

export default async function LawPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);

  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin
  );
  if (workspaceKey !== "law_office") return <NotLawOffice />;

  const [orgRole, { data: membership }, members, { data: cases }, { data: contacts }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .maybeSingle(),
    getOrgMembers(supabase, orgId),
    supabase
      .from("legal_cases")
      .select("*")
      .eq("org_id", orgId)
      .order("next_deadline_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("contacts")
      .select("id,name")
      .eq("org_id", orgId)
      .eq("workspace_key", "law_office")
      .order("name"),
  ]);

  const isAdmin = orgRole === "admin";
  const jobRole = membership?.job_role;
  if (!canViewLegal(jobRole, isAdmin)) return <AccessDenied />;

  const allCases = (cases ?? []) as LegalCase[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const activeCases = allCases.filter((item) => ["intake", "active", "waiting", "suspended"].includes(item.status));
  const deadlines = activeCases.filter(
    (item) => item.next_deadline_at && new Date(item.next_deadline_at) < new Date(Date.now() + 7 * 86_400_000)
  );
  const memberName = new Map(members.map((member) => [member.user_id, member.name ?? "Sem nome"]));

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Operação jurídica</p>
          <h1 className="mt-2 text-[clamp(1.7rem,5vw,3.1rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            Casos
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ink-soft">
            Carteira de trabalho depois que o atendimento virou cliente: responsável, área, processo, risco e próximo passo.
          </p>
        </div>
        <Link
          href="/law/deadlines"
          className="nav-item inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-black text-ink-soft shadow-[0_12px_28px_-22px_rgba(15,23,42,.5)] hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          Ver prazos
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLink
          href="/pipeline"
          label="Atendimentos"
          description="Leads, triagens e propostas antes de virar caso."
          icon={IconUsers}
        />
        <QuickLink
          href="/law#new-case"
          label="Novo caso"
          description="Abra a operação jurídica de um cliente contratado."
          icon={IconPlus}
        />
        <QuickLink
          href="/law/deadlines"
          label="Prazos"
          description="Fila por data para o time jurídico acompanhar."
          icon={IconAlert}
        />
        <QuickLink
          href="/finance"
          label="Honorários"
          description="Contratos, parcelas e recebimentos do escritório."
          icon={IconWallet}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Metric icon={IconColumns} label="Casos ativos" value={String(activeCases.length)} />
        <Metric icon={IconAlert} label="Prazo nos próximos 7 dias" value={String(deadlines.length)} warning />
        <Metric
          icon={IconUsers}
          label="Clientes com caso"
          value={String(new Set(activeCases.map((item) => item.contact_id).filter(Boolean)).size)}
        />
      </section>

      {canManageLegal(jobRole, isAdmin) && (
        <section id="new-case" className="panel scroll-mt-28 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700">
              <IconPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-ink">Abrir novo caso</h2>
              <p className="text-sm font-medium text-ink-muted">
                Use caso para trabalho jurídico ativo. Para lead, consulta ou proposta, use Atendimentos.
              </p>
            </div>
          </div>

          <form action={createLegalCase} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field
              name="title"
              label="Caso"
              required
              placeholder="Ex.: Reclamatória trabalhista - Ana"
              className="xl:col-span-2"
            />
            <Select
              name="contact_id"
              label="Cliente"
              options={allContacts.map((contact) => ({ value: contact.id, label: contact.name }))}
              placeholder="Selecione"
            />
            <Select
              name="responsible_id"
              label="Responsável"
              defaultValue={user!.id}
              options={members.map((member) => ({
                value: member.user_id,
                label: member.user_id === user!.id ? "Eu" : member.name ?? "Sem nome",
              }))}
            />
            <Field name="area" label="Área do direito" placeholder="Ex.: Trabalhista" />
            <Field name="case_number" label="Nº do processo" placeholder="0000000-00.0000.0.00.0000" />
            <Field name="next_deadline_at" label="Próximo prazo" type="datetime-local" />
            <Select
              name="risk_level"
              label="Prioridade"
              defaultValue="standard"
              options={[
                { value: "low", label: "Baixa" },
                { value: "standard", label: "Normal" },
                { value: "high", label: "Alta" },
                { value: "critical", label: "Crítica" },
              ]}
            />
            <input type="hidden" name="status" value="intake" />
            <input type="hidden" name="confidentiality" value="restricted" />
            <div className="md:col-span-2 xl:col-span-4">
              <label className="label" htmlFor="case-summary">
                Resumo de triagem
              </label>
              <textarea
                id="case-summary"
                name="summary"
                maxLength={1600}
                rows={2}
                className="field mt-1.5 min-h-20 resize-y"
                placeholder="Fatos, objetivo do cliente e documentos pendentes..."
              />
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <PendingButton className="btn" pendingLabel="Abrindo caso">
                <IconPlus className="h-4 w-4" />
                Abrir caso
              </PendingButton>
            </div>
          </form>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-ink">Carteira de casos</h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">Casos ordenados pelo próximo prazo.</p>
          </div>
          <span className="tag bg-surface-2 text-ink-muted">{allCases.length} no total</span>
        </div>
        {allCases.length === 0 ? (
          <EmptyCases />
        ) : (
          <div className="divide-y divide-line">
            {allCases.map((item) => (
              <Link
                key={item.id}
                href={`/law/${item.id}`}
                className="nav-item grid gap-3 px-5 py-4 hover:bg-brand-50 sm:grid-cols-[minmax(0,1fr)_9rem_10rem_10rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink">{item.title}</p>
                  <p className="mt-1 truncate text-xs font-bold text-ink-muted">
                    {item.area ?? "Área não informada"}
                    {item.case_number ? ` · ${item.case_number}` : ""}
                  </p>
                </div>
                <Status status={item.status} />
                <span className="text-xs font-bold text-ink-muted">
                  {item.responsible_id ? memberName.get(item.responsible_id) : "Sem responsável"}
                </span>
                <span
                  className={
                    "text-xs font-black " +
                    (item.next_deadline_at && new Date(item.next_deadline_at) < new Date(Date.now() + 7 * 86_400_000)
                      ? "text-danger-600"
                      : "text-ink-muted")
                  }
                >
                  {item.next_deadline_at
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                        new Date(item.next_deadline_at)
                      )
                    : "Sem prazo"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: (p: { className?: string }) => JSX.Element;
}) {
  return (
    <Link
      href={href}
      className="nav-item panel flex min-h-[6rem] items-start gap-3 p-4 hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-ink">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-relaxed text-ink-muted">{description}</span>
      </span>
    </Link>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: (p: { className?: string }) => JSX.Element;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <article className="panel p-4">
      <span
        className={
          "grid h-10 w-10 place-items-center rounded-full " +
          (warning ? "bg-danger-50 text-danger-600" : "bg-brand-50 text-brand-700")
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-bold text-ink-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-black tracking-[-.04em] text-ink">{value}</p>
    </article>
  );
}

function Status({ status }: { status: LegalCase["status"] }) {
  return <span className="w-fit rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-black text-ink-soft">{LEGAL_CASE_STATUS[status]}</span>;
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const id = `case-${name}`;
  return (
    <label className={"block " + className}>
      <span className="label">
        {label}
        {required && (
          <>
            <span className="ml-1 text-brand-700">*</span>
            <span className="sr-only"> obrigatório</span>
          </>
        )}
      </span>
      <input
        id={id}
        name={name}
        required={required}
        type={type}
        maxLength={type === "text" ? 180 : undefined}
        placeholder={placeholder}
        className="field mt-1.5"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} className="field mt-1.5">
        <option value="">{placeholder ?? "Selecione"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AccessDenied() {
  return (
    <section className="panel max-w-xl p-6">
      <p className="text-sm font-black text-brand-700">Acesso restrito</p>
      <h1 className="mt-2 text-2xl font-black text-ink">Sua função não acessa casos jurídicos.</h1>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink-muted">
        Peça a um sócio administrador para atribuir um cargo jurídico à sua conta.
      </p>
    </section>
  );
}

function NotLawOffice() {
  return (
    <section className="panel max-w-xl p-6">
      <h1 className="text-2xl font-black text-ink">Área jurídica disponível no workspace de advocacia.</h1>
      <Link href="/dashboard" className="btn mt-4">
        Voltar ao painel
      </Link>
    </section>
  );
}

function EmptyCases() {
  return (
    <div className="p-8 text-center">
      <IconColumns className="mx-auto h-8 w-8 text-brand-700" />
      <p className="mt-3 text-sm font-black text-ink">Nenhum caso aberto ainda.</p>
      <p className="mt-1 text-sm font-medium text-ink-muted">
        Use o formulário acima para transformar um atendimento contratado em operação jurídica.
      </p>
    </div>
  );
}
