import Link from "next/link";
import { PendingButton } from "@/components/ui/PendingButton";
import { ActionDrawer } from "@/components/design-system/action-drawer";
import { LegalCaseList, type LegalCaseRow } from "@/components/legal/legal-case-list";
import { MetricBand, type StatusIntent } from "@/components/ui/data-display";
import { EmptyState, PermissionState } from "@/components/ui/feedback";
import { DataPanel, Page, PageHeader } from "@/components/ui/surface";
import {
  canManageLegal,
  canViewLegal,
  LEGAL_CASE_RISK,
  LEGAL_CASE_STATUS,
} from "@/lib/law/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, LegalCase, LegalCaseStatus, LegalWatchedProcess } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconPlus } from "../../icons";
import { createLegalCase } from "../actions";
import { DatajudSearchForm } from "../consulta/DatajudSearchForm";
import { legalCaseHref } from "@/lib/law/legal-case-path";

const ACTIVE_STATUSES: LegalCaseStatus[] = ["intake", "active", "waiting", "suspended"];
const STATUS_FILTERS: Array<{ value: "" | LegalCaseStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "intake", label: LEGAL_CASE_STATUS.intake },
  { value: "active", label: LEGAL_CASE_STATUS.active },
  { value: "waiting", label: LEGAL_CASE_STATUS.waiting },
  { value: "suspended", label: LEGAL_CASE_STATUS.suspended },
  { value: "closed", label: LEGAL_CASE_STATUS.closed },
];

type CaseQueue = "prazos" | "criticos" | "sem-prazo";

function processosHref(params: { busca?: string; status?: string; filtro?: string }) {
  const query = new URLSearchParams();
  if (params.busca) query.set("busca", params.busca);
  if (params.status) query.set("status", params.status);
  if (params.filtro) query.set("filtro", params.filtro);
  const serialized = query.toString();
  return serialized ? `/juridico/processos?${serialized}` : "/juridico/processos";
}

function statusIntent(status: LegalCaseStatus): StatusIntent {
  if (status === "active") return "success";
  if (status === "intake") return "info";
  if (status === "waiting" || status === "suspended") return "warning";
  return "neutral";
}

function riskIntent(risk: LegalCase["risk_level"]): StatusIntent {
  if (risk === "critical") return "danger";
  if (risk === "high") return "warning";
  return "neutral";
}

export default async function LawPage(props: {
  searchParams?: Promise<{ busca?: string; novo?: string; status?: string; filtro?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin, favorite_tribunals").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);

  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin
  );
  if (workspaceKey !== "law_office") return <NotLawOffice />;

  const [orgRole, { data: membership }, members, { data: cases }, { data: contacts }, { data: watchedRows }] = await Promise.all([
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
    supabase
      .from("legal_watched_processes")
      .select("case_id, last_movement_nome, last_movement_at, seen_at, datajud_sync_failed_count")
      .eq("org_id", orgId),
  ]);

  const isAdmin = orgRole === "admin";
  const jobRole = membership?.job_role;
  if (!canViewLegal(jobRole, isAdmin)) return <AccessDenied />;

  const allCases = (cases ?? []) as LegalCase[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const watched = (watchedRows ?? []) as Pick<
    LegalWatchedProcess,
    "case_id" | "last_movement_nome" | "last_movement_at" | "seen_at" | "datajud_sync_failed_count"
  >[];
  const contactOptions = allContacts.map((contact) => ({ value: contact.id, label: contact.name }));
  const memberOptions = members.map((member) => ({
    value: member.user_id,
    label: member.user_id === user!.id ? "Eu" : member.name ?? "Sem nome",
  }));
  const activeCases = allCases.filter((item) => ACTIVE_STATUSES.includes(item.status));
  const deadlineThreshold = new Date();
  deadlineThreshold.setDate(deadlineThreshold.getDate() + 7);
  const now = new Date();
  const nearDeadline = activeCases.filter(
    (item) => item.next_deadline_at && new Date(item.next_deadline_at) < deadlineThreshold
  );
  const critical = activeCases.filter((item) => item.risk_level === "high" || item.risk_level === "critical");
  const withoutDeadline = activeCases.filter((item) => !item.next_deadline_at);
  const memberName = new Map(members.map((member) => [member.user_id, member.name ?? "Sem nome"]));
  const unreadByCase = new Map(
    watched
      .filter((item) => item.case_id && item.last_movement_at && (!item.seen_at || new Date(item.last_movement_at) > new Date(item.seen_at)))
      .map((item) => [item.case_id!, item]),
  );
  const failedSyncByCase = new Set(
    watched.filter((item) => item.case_id && item.datajud_sync_failed_count > 0).map((item) => item.case_id!),
  );

  const query = searchParams?.busca?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const statusFilter = (Object.keys(LEGAL_CASE_STATUS) as LegalCaseStatus[]).includes(searchParams?.status as LegalCaseStatus)
    ? (searchParams?.status as LegalCaseStatus)
    : "";
  const queueFilter = searchParams?.filtro === "prazos" || searchParams?.filtro === "criticos" || searchParams?.filtro === "sem-prazo"
    ? (searchParams.filtro as CaseQueue)
    : "";

  const visibleCases = allCases.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (queueFilter === "prazos" && !(item.next_deadline_at && new Date(item.next_deadline_at) < deadlineThreshold && ACTIVE_STATUSES.includes(item.status))) return false;
    if (queueFilter === "criticos" && !((item.risk_level === "high" || item.risk_level === "critical") && ACTIVE_STATUSES.includes(item.status))) return false;
    if (queueFilter === "sem-prazo" && !(!item.next_deadline_at && ACTIVE_STATUSES.includes(item.status))) return false;
    if (!query) return true;
    return [item.title, item.case_number, item.area, item.court, item.jurisdiction, item.opposing_party].some((value) =>
      value?.toLocaleLowerCase("pt-BR").includes(query),
    );
  });

  const caseRows: LegalCaseRow[] = visibleCases.map((item) => {
    const deadline = item.next_deadline_at ? new Date(item.next_deadline_at) : null;
    const overdue = Boolean(deadline && deadline < now);
    const near = Boolean(deadline && deadline < deadlineThreshold);
    const unread = unreadByCase.get(item.id);
    const syncFailed = failedSyncByCase.has(item.id);
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      subtitle: `${item.area ?? "Área não informada"}${item.case_number ? ` · ${item.case_number}` : ""}`,
      placeLabel: [item.court, item.jurisdiction, item.opposing_party ? `x ${item.opposing_party}` : null]
        .filter(Boolean)
        .join(" · ") || null,
      statusLabel: LEGAL_CASE_STATUS[item.status],
      statusIntent: statusIntent(item.status),
      riskLabel: LEGAL_CASE_RISK[item.risk_level],
      riskIntent: riskIntent(item.risk_level),
      responsibleLabel: item.responsible_id ? memberName.get(item.responsible_id) ?? "Sem responsável" : "Sem responsável",
      deadlineLabel: deadline
        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(deadline)
        : "Sem prazo",
      deadlineIntent: overdue ? "danger" : near ? "warning" : deadline ? "neutral" : "warning",
      datajudLabel: syncFailed
        ? "DataJud com alerta de sincronização"
        : unread?.last_movement_nome
          ? `Movimentação nova · ${unread.last_movement_nome}`
          : item.datajud_tribunal_alias
            ? "Monitorado no DataJud"
            : null,
    };
  });

  const attention = activeCases
    .map((item) => {
      const reasons: string[] = [];
      if (item.next_deadline_at && new Date(item.next_deadline_at) < now) reasons.push("Prazo atrasado");
      else if (item.next_deadline_at && new Date(item.next_deadline_at) < deadlineThreshold) reasons.push("Prazo nos próximos 7 dias");
      if (!item.next_deadline_at) reasons.push("Sem prazo");
      if (item.risk_level === "critical" || item.risk_level === "high") reasons.push(`Prioridade ${LEGAL_CASE_RISK[item.risk_level].toLowerCase()}`);
      if (failedSyncByCase.has(item.id)) reasons.push("Sincronização DataJud falhou");
      if (unreadByCase.has(item.id)) reasons.push("Movimentação para revisar");
      return reasons.length ? { id: item.id, slug: item.slug, title: item.title, reasons } : null;
    })
    .filter((item): item is { id: string; slug: string; title: string; reasons: string[] } => Boolean(item))
    .slice(0, 6);

  const canManage = canManageLegal(jobRole, isAdmin);
  const busca = searchParams?.busca?.trim() ?? "";

  return (
    <Page>
      <PageHeader
        eyebrow="Jurídico"
        description="Consulte o DataJud pelo número CNJ, abra o caso e acompanhe prazo, risco e comarca no mesmo lugar."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/juridico/prazos" className="ui-button ui-button--secondary">
              Agenda e prazos
            </Link>
            {canManage ? (
              <ActionDrawer
                label="Novo caso"
                title="Abrir novo caso"
                description="Transforme um atendimento contratado em operação jurídica."
                icon={<IconPlus className="h-4 w-4" />}
                triggerClassName="ui-button ui-button--primary"
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
        }
      />

      <MetricBand
        aria-label="Resumo dos processos"
        items={[
          {
            label: "Casos ativos",
            value: activeCases.length,
            href: processosHref({ busca, status: statusFilter }),
            current: !queueFilter,
          },
          {
            label: "Prazos nos próximos 7 dias",
            value: nearDeadline.length,
            tone: nearDeadline.length > 0 ? "warning" : undefined,
            href: processosHref({ busca, status: statusFilter, filtro: "prazos" }),
            current: queueFilter === "prazos",
          },
          {
            label: "Prioridade alta",
            value: critical.length,
            tone: critical.length > 0 ? "danger" : undefined,
            href: processosHref({ busca, status: statusFilter, filtro: "criticos" }),
            current: queueFilter === "criticos",
          },
          {
            label: "Sem prazo",
            value: withoutDeadline.length,
            tone: withoutDeadline.length > 0 ? "warning" : undefined,
            href: processosHref({ busca, status: statusFilter, filtro: "sem-prazo" }),
            current: queueFilter === "sem-prazo",
          },
        ]}
      />

      <div id="datajud" className="scroll-mt-24">
        <DatajudSearchForm
          initialFavorites={profile?.favorite_tribunals ?? []}
          canManage={canManage}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
        <DataPanel
          title="Processos em acompanhamento"
          description={
            query
              ? `${visibleCases.length} resultado(s) para “${searchParams?.busca}”`
              : "Ordenados pelo próximo prazo. Filtre por situação ou pelo que precisa de ação."
          }
          count={visibleCases.length}
          actions={
            <form className="flex min-w-0 max-w-sm flex-1 gap-2" action="/juridico/processos">
              {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
              {queueFilter ? <input type="hidden" name="filtro" value={queueFilter} /> : null}
              <label className="sr-only" htmlFor="busca">
                Buscar processos
              </label>
              <input
                id="busca"
                name="busca"
                defaultValue={busca}
                placeholder="Nome, número, área ou comarca"
                className="ui-control min-h-11"
              />
              <button type="submit" className="ui-button ui-button--secondary">
                Buscar
              </button>
            </form>
          }
        >
          <div className="flex flex-wrap gap-2 border-b border-od-border px-5 py-3">
            {STATUS_FILTERS.map((item) => {
              const href = processosHref({ busca, status: item.value, filtro: queueFilter || undefined });
              const current = statusFilter === item.value;
              return (
                <Link
                  key={item.label}
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-xs font-semibold ${
                    current ? "bg-od-accent text-white" : "text-od-text-2 hover:bg-od-surface-hover hover:text-od-text"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {query || statusFilter || queueFilter ? (
              <Link href="/juridico/processos" className="inline-flex min-h-11 items-center px-3 text-xs font-semibold text-od-text-2">
                Limpar filtros
              </Link>
            ) : null}
          </div>
          {visibleCases.length === 0 ? (
            <EmptyState
              inset
              title="Nenhum caso encontrado."
              description="Abra um caso ou limpe a busca para ver a fila do escritório."
            />
          ) : (
            <LegalCaseList rows={caseRows} canManage={canManage} />
          )}
        </DataPanel>

        <DataPanel
          title="Precisa de atenção"
          description="Prazos, prioridade, DataJud e o que ainda não tem compromisso."
          count={attention.length}
        >
          {attention.length === 0 ? (
            <EmptyState inset title="Nada urgente agora." description="Os casos ativos estão com prazo e sem alerta de sincronização." />
          ) : (
            <ul>
              {attention.map((item) => (
                <li key={item.id} className="border-b border-od-border last:border-b-0">
                  <Link href={legalCaseHref(item.slug, item.id)} className="block px-5 py-4 hover:bg-od-surface-hover">
                    <p className="truncate text-[13px] font-semibold text-od-text">{item.title}</p>
                    <p className="mt-1 text-xs text-od-text-3">{item.reasons.join(" · ")}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>
      </div>
    </Page>
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
            <span className="ml-1 text-od-accent">*</span>
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
    <Page>
      <PermissionState
        title="Acesso restrito"
        description="Seu cargo não acessa casos jurídicos."
      />
    </Page>
  );
}

function NotLawOffice() {
  return (
    <Page>
      <PermissionState
        title="Processos jurídicos disponíveis no workspace de advocacia."
        action={
          <Link href="/painel" className="ui-button ui-button--primary">
            Voltar ao painel
          </Link>
        }
      />
    </Page>
  );
}
