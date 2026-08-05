import Link from "next/link";
import { PendingButton } from "@/components/ui/PendingButton";
import { ActionDrawer } from "@/components/design-system/action-drawer";
import { canManageLegal, canViewLegal, LEGAL_CASE_STATUS } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, LegalCase } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconAlert, IconColumns, IconPlus, IconSearch, IconUsers } from "../../icons";
import { createLegalCase } from "../actions";

export default async function LawPage(props: { searchParams?: Promise<{ busca?: string; novo?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
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
  const contactOptions = allContacts.map((contact) => ({ value: contact.id, label: contact.name }));
  const memberOptions = members.map((member) => ({
    value: member.user_id,
    label: member.user_id === user!.id ? "Eu" : member.name ?? "Sem nome",
  }));
  const activeCases = allCases.filter((item) => ["intake", "active", "waiting", "suspended"].includes(item.status));
  const deadlineThreshold = new Date();
  deadlineThreshold.setDate(deadlineThreshold.getDate() + 7);
  const deadlines = activeCases.filter(
    (item) => item.next_deadline_at && new Date(item.next_deadline_at) < deadlineThreshold
  );
  const memberName = new Map(members.map((member) => [member.user_id, member.name ?? "Sem nome"]));
  const query = searchParams?.busca?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const visibleCases = query
    ? allCases.filter((item) => [item.title, item.case_number, item.area, item.court].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query)))
    : allCases;

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-od-text-2">Jurídico / Processos</p>
          <h1 className="mt-2 text-od-title text-white">Carteira de processos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/52">Casos ativos, responsáveis, risco e próximo compromisso em uma única fila operacional.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/painel/juridico/consulta" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/[0.1] px-4 text-xs font-semibold text-white/65 hover:bg-white/[0.04] hover:text-white"><IconSearch className="h-4 w-4"/>Consulta DataJud</Link>
          <Link href="/painel/juridico/prazos" className="inline-flex min-h-11 items-center rounded-md border border-white/[0.1] px-4 text-xs font-semibold text-white/65 hover:bg-white/[0.04] hover:text-white">Agenda e prazos</Link>
          {canManageLegal(jobRole, isAdmin) ? (
            <ActionDrawer
              label="Novo caso"
              title="Abrir novo caso"
              description="Transforme um atendimento contratado em operação jurídica."
              icon={<IconPlus className="h-4 w-4" />}
              initialOpen={searchParams?.novo === "1"}
            >
              <NewCaseForm
                userId={user!.id}
                contactOptions={contactOptions}
                memberOptions={memberOptions}
              />
            </ActionDrawer>
          ) : null}
        </div>
      </header>

      <section className="grid border-y border-white/[0.08] sm:grid-cols-3">
        <Metric icon={IconColumns} label="Casos ativos" value={String(activeCases.length)} />
        <Metric icon={IconAlert} label="Prazos nos próximos 7 dias" value={String(deadlines.length)} warning />
        <Metric icon={IconUsers} label="Clientes com caso" value={String(new Set(activeCases.map((item) => item.contact_id).filter(Boolean)).size)} />
      </section>

      <section className="overflow-hidden panel">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Processos em acompanhamento</h2>
            <p className="mt-1 text-xs text-white/52">{query ? `${visibleCases.length} resultado(s) para “${searchParams?.busca}”` : "Ordenados pelo próximo prazo"}</p>
          </div>
          <div className="flex items-center gap-3"><span className="text-xs text-od-text-3">{allCases.length} no total</span>{query ? <Link href="/painel/juridico/processos" className="text-xs font-semibold text-od-text-2">Limpar busca</Link> : null}</div>
        </div>
        {visibleCases.length === 0 ? (
          <EmptyCases />
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1.5fr)_8rem_9rem_10rem] gap-4 border-b border-white/[0.07] px-5 py-2 text-od-label text-od-text-3 sm:grid"><span>Caso</span><span>Situação</span><span>Responsável</span><span>Próximo prazo</span></div>
            {visibleCases.map((item) => (
              <Link
                key={item.id}
                href={`/painel/juridico/processos/${item.id}`}
                className="grid gap-3 border-b border-white/[0.06] px-5 py-4 hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1.5fr)_8rem_9rem_10rem] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-od-text-3">
                    {item.area ?? "Área não informada"}
                    {item.case_number ? ` · ${item.case_number}` : ""}
                  </p>
                </div>
                <Status status={item.status} />
                <span className="text-xs text-white/58">
                  {item.responsible_id ? memberName.get(item.responsible_id) : "Sem responsável"}
                </span>
                <span
                  className={
                    "text-xs font-semibold " +
                    (item.next_deadline_at && new Date(item.next_deadline_at) < deadlineThreshold
                      ? "text-[#fb7767]"
                      : "text-white/52")
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

function NewCaseForm({
  userId,
  contactOptions,
  memberOptions,
}: {
  userId: string;
  contactOptions: { value: string; label: string }[];
  memberOptions: { value: string; label: string }[];
}) {
  return (
    <form action={createLegalCase} className="grid gap-4 sm:grid-cols-2">
      <Field
        name="title"
        label="Caso"
        required
        placeholder="Ex.: Reclamatória trabalhista - Ana"
        className="sm:col-span-2"
      />
      <Select name="contact_id" label="Cliente" options={contactOptions} placeholder="Selecione" />
      <Select name="responsible_id" label="Responsável" defaultValue={userId} options={memberOptions} />
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
      <div className="sm:col-span-2">
        <label className="label" htmlFor="case-summary">Resumo de triagem</label>
        <textarea
          id="case-summary"
          name="summary"
          maxLength={1600}
          rows={4}
          className="field mt-1.5 min-h-28 resize-y"
          placeholder="Fatos, objetivo do cliente e documentos pendentes..."
        />
      </div>
      <div className="sm:col-span-2 flex justify-end border-t border-od-border pt-5">
        <PendingButton className="btn" pendingLabel="Abrindo caso">
          <IconPlus className="h-4 w-4" />
          Abrir caso
        </PendingButton>
      </div>
    </form>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: (p: { className?: string }) => React.ReactElement;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <article className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className={warning ? "text-[#fb7767]" : "text-od-text-2"}><Icon className="h-4 w-4" /></span>
      <div><p className="text-xs font-medium text-od-text-3">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-.02em] text-white">{value}</p></div>
    </article>
  );
}

function Status({ status }: { status: LegalCase["status"] }) {
  return <span className="w-fit rounded-md bg-white/[0.06] px-2 py-1 text-xs font-semibold text-od-text">{LEGAL_CASE_STATUS[status]}</span>;
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
      <Link href="/painel" className="btn mt-4">
        Voltar ao painel
      </Link>
    </section>
  );
}

function EmptyCases() {
  return (
    <div className="p-8 text-center">
      <IconColumns className="mx-auto h-7 w-7 text-od-text-2" />
      <p className="mt-3 text-sm font-semibold text-white">Nenhum caso encontrado.</p>
      <p className="mt-1 text-[12px] text-od-text-3">
        Use o formulário acima para transformar um atendimento contratado em operação jurídica.
      </p>
    </div>
  );
}
