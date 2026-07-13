import Link from "next/link";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/app-ui";
import { PendingButton } from "@/components/PendingButton";
import {
  canViewFinance,
  outstandingCents,
  receivableState,
} from "@/lib/law-office";
import { formatBRL } from "@/lib/format";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type {
  Contact,
  LegalCase,
  LegalExpense,
  Receivable,
} from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconAlert, IconCheckCircle, IconPlus, IconWallet } from "../icons";
import {
  createFeeAgreement,
  createLegalExpense,
  recordReceivablePayment,
  toggleLegalExpenseReimbursed,
} from "../law/actions";

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  court_fee: "Custas judiciais",
  travel: "Deslocamento",
  registry: "Cartório",
  expert: "Perícia",
  correspondent: "Correspondente",
  copy: "Cópias",
  other: "Outro",
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ receive?: string }>;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type,is_admin")
      .eq("id", user!.id)
      .maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  if (
    getWorkspaceKey(
      profile?.profession_type,
      user?.user_metadata?.profession_type,
      profile?.is_admin,
    ) !== "law_office"
  )
    return <NotLawOffice />;
  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewFinance(membership?.job_role, isAdmin)) return <AccessDenied />;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [
    { data: receivableRows },
    { data: contacts },
    { data: cases },
    { data: payments },
    { data: expenseRows },
  ] = await Promise.all([
    supabase
      .from("receivables")
      .select("*")
      .eq("org_id", orgId)
      .order("due_date"),
    supabase
      .from("contacts")
      .select("id,name")
      .eq("org_id", orgId)
      .eq("workspace_key", "law_office")
      .order("name"),
    supabase
      .from("legal_cases")
      .select("id,title")
      .eq("org_id", orgId)
      .order("title"),
    supabase
      .from("receivable_payments")
      .select("amount_cents")
      .eq("org_id", orgId)
      .gte("paid_at", monthStart.toISOString()),
    supabase
      .from("legal_expenses")
      .select("*")
      .eq("org_id", orgId)
      .order("expense_date", { ascending: false }),
  ]);
  const receivables = (receivableRows ?? []) as Receivable[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const allCases = (cases ?? []) as Pick<LegalCase, "id" | "title">[];
  const expenses = (expenseRows ?? []) as LegalExpense[];
  const contactNames = new Map(allContacts.map((item) => [item.id, item.name]));
  const caseTitles = new Map(allCases.map((item) => [item.id, item.title]));
  const open = receivables.filter(
    (item) => item.status !== "paid" && item.status !== "cancelled",
  );
  const overdue = open.filter((item) => receivableState(item) === "overdue");
  const paidThisMonth = (payments ?? []).reduce(
    (sum, item) => sum + (item.amount_cents ?? 0),
    0,
  );
  const openCents = open.reduce((sum, item) => sum + outstandingCents(item), 0);
  const openReimbursableCents = expenses
    .filter((item) => item.reimbursable && !item.reimbursed)
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const receive = (await searchParams).receive;
  const selected = receive
    ? receivables.find((item) => item.id === receive)
    : null;
  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Financeiro do escritório"
        title="Honorários e recebimentos"
        description="Receita do escritório separada de reembolsos e valores que pertencem ao cliente."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/finance/import"
              className="btn-soft inline-flex min-h-11 items-center justify-center px-4"
            >
              Importar planilha (CSV)
            </Link>
            <Link
              href="/law"
              className="btn-soft inline-flex min-h-11 items-center justify-center px-4"
            >
              Ver casos jurídicos
            </Link>
          </div>
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="A receber"
          value={formatBRL(openCents)}
          icon={IconWallet}
        />
        <Metric
          label="Vencido"
          value={formatBRL(
            overdue.reduce((sum, item) => sum + outstandingCents(item), 0),
          )}
          icon={IconAlert}
          danger
        />
        <Metric
          label="Recebido no mês"
          value={formatBRL(paidThisMonth)}
          icon={IconCheckCircle}
        />
        <Metric
          label="Contas pendentes"
          value={String(open.length)}
          icon={IconWallet}
        />
        <Metric
          label="Despesas a reembolsar"
          value={formatBRL(openReimbursableCents)}
          icon={IconWallet}
        />
      </section>
      <section className="panel p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700">
            <IconPlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-ink">
              Novo contrato de honorários
            </h2>
            <p className="text-sm font-medium text-ink-muted">
              Ao salvar, o OtimizIA gera as parcelas automaticamente.
            </p>
          </div>
        </div>
        <form
          action={createFeeAgreement}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <TextField
            name="title"
            label="Contrato / serviço"
            required
            placeholder="Ex.: Honorários trabalhistas"
            className="xl:col-span-2"
          />
          <Select
            name="contact_id"
            label="Cliente"
            options={allContacts.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            required
          />
          <Select
            name="case_id"
            label="Caso vinculado"
            options={allCases.map((item) => ({
              value: item.id,
              label: item.title,
            }))}
          />
          <Select
            name="fee_type"
            label="Modalidade"
            defaultValue="fixed"
            options={[
              { value: "fixed", label: "Valor fixo" },
              { value: "recurring", label: "Mensal" },
              { value: "stage", label: "Por etapa" },
              { value: "hourly", label: "Por hora" },
              { value: "success", label: "Êxito" },
              { value: "consultation", label: "Consulta" },
            ]}
          />
          <TextField
            name="total"
            label="Valor contratado (R$)"
            placeholder="0,00"
          />
          <TextField
            name="installments"
            label="Parcelas"
            type="number"
            defaultValue="1"
          />
          <TextField name="first_due_date" label="1º vencimento" type="date" />
          <TextField
            name="success_percent"
            label="Percentual de êxito"
            type="number"
            placeholder="Ex.: 20"
          />
          <TextField
            name="success_basis"
            label="Base do êxito"
            placeholder="Ex.: valor recebido"
          />
          <TextField name="signed_at" label="Assinado em" type="date" />
          <div className="md:col-span-2 xl:col-span-4">
            <label className="label" htmlFor="agreement-notes">
              Observações
            </label>
            <textarea
              id="agreement-notes"
              name="notes"
              rows={2}
              maxLength={1600}
              className="field mt-1.5 min-h-20 resize-y"
              placeholder="Condições especiais, forma de cobrança, responsabilidades..."
            />
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <PendingButton className="btn" pendingLabel="Gerando parcelas">
              <IconPlus className="h-4 w-4" />
              Criar contrato e parcelas
            </PendingButton>
          </div>
        </form>
      </section>
      {selected && (
        <section className="panel border-brand-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-brand-700">
                Registrar recebimento
              </p>
              <h2 className="mt-1 text-lg font-black text-ink">
                {selected.description}
              </h2>
              <p className="mt-1 text-sm font-medium text-ink-muted">
                Saldo: {formatBRL(outstandingCents(selected))}
              </p>
            </div>
            <Link
              href="/finance"
              className="nav-item rounded-md px-2 py-1 text-sm font-bold text-ink-muted hover:bg-surface-2"
            >
              Fechar
            </Link>
          </div>
          <form
            action={recordReceivablePayment}
            className="mt-4 grid gap-3 md:grid-cols-4"
          >
            <input type="hidden" name="receivable_id" value={selected.id} />
            <TextField
              name="amount"
              label="Valor recebido (R$)"
              required
              placeholder="0,00"
            />
            <Select
              name="method"
              label="Forma"
              defaultValue="pix"
              options={[
                { value: "pix", label: "Pix" },
                { value: "boleto", label: "Boleto" },
                { value: "transfer", label: "Transferência" },
                { value: "card", label: "Cartão" },
                { value: "cash", label: "Dinheiro" },
                { value: "other", label: "Outro" },
              ]}
            />
            <TextField
              name="paid_at"
              label="Data e hora"
              type="datetime-local"
            />
            <TextField
              name="reference"
              label="Referência"
              placeholder="Id. do Pix, banco..."
            />
            <div className="md:col-span-4">
              <PendingButton className="btn" pendingLabel="Registrando">
                Confirmar recebimento
              </PendingButton>
            </div>
          </form>
        </section>
      )}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-ink">Contas a receber</h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              Acompanhe saldo, vencimento e baixa sem misturar com propostas.
            </p>
          </div>
          <span className="tag bg-surface-2 text-ink-muted">
            {receivables.length} lançamentos
          </span>
        </div>
        {receivables.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[.08em] text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-black">Descrição</th>
                  <th className="px-4 py-3 font-black">Cliente</th>
                  <th className="px-4 py-3 font-black">Vencimento</th>
                  <th className="px-4 py-3 font-black">Saldo</th>
                  <th className="px-4 py-3 font-black">Situação</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {receivables.map((item) => {
                  const state = receivableState(item);
                  return (
                    <tr key={item.id} className="hover:bg-brand-50">
                      <td className="px-5 py-4">
                        <p className="max-w-[18rem] truncate text-sm font-black text-ink">
                          {item.description}
                        </p>
                        <p className="mt-1 text-xs font-bold text-ink-muted">
                          {item.category === "client_funds"
                            ? "Valor do cliente"
                            : "Receita do escritório"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-ink-soft">
                        {item.contact_id
                          ? (contactNames.get(item.contact_id) ??
                            "Cliente removido")
                          : "—"}
                      </td>
                      <td
                        className={
                          "px-4 py-4 text-sm font-black " +
                          (state === "overdue"
                            ? "text-danger-600"
                            : "text-ink-soft")
                        }
                      >
                        {new Intl.DateTimeFormat("pt-BR").format(
                          new Date(`${item.due_date}T12:00:00`),
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-ink">
                        {formatBRL(outstandingCents(item))}
                      </td>
                      <td className="px-4 py-4">
                        <State state={state} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {state !== "paid" && state !== "cancelled" && (
                          <Link
                            href={`/finance?receive=${item.id}`}
                            className="nav-item rounded-md border border-line bg-surface px-3 py-2 text-xs font-black text-brand-700 hover:border-brand-300 hover:bg-brand-50"
                          >
                            Receber
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700">
            <IconPlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-ink">Nova despesa</h2>
            <p className="text-sm font-medium text-ink-muted">
              Custas, deslocamento e outros gastos do escritório ou do caso.
            </p>
          </div>
        </div>
        <form
          action={createLegalExpense}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <TextField
            name="description"
            label="Descrição"
            required
            placeholder="Ex.: Custas de distribuição"
            className="xl:col-span-2"
          />
          <Select
            name="category"
            label="Categoria"
            defaultValue="court_fee"
            options={Object.entries(EXPENSE_CATEGORY_LABEL).map(
              ([value, label]) => ({ value, label }),
            )}
          />
          <TextField
            name="amount"
            label="Valor (R$)"
            required
            placeholder="0,00"
          />
          <Select
            name="case_id"
            label="Caso vinculado"
            options={allCases.map((item) => ({
              value: item.id,
              label: item.title,
            }))}
          />
          <TextField name="expense_date" label="Data" type="date" />
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-bold text-ink-soft">
            <input type="checkbox" name="reimbursable" defaultChecked />
            Reembolsável
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <label className="label" htmlFor="expense-notes">
              Observações
            </label>
            <textarea
              id="expense-notes"
              name="notes"
              rows={2}
              maxLength={1600}
              className="field mt-1.5 min-h-20 resize-y"
            />
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <PendingButton className="btn" pendingLabel="Registrando">
              <IconPlus className="h-4 w-4" />
              Registrar despesa
            </PendingButton>
          </div>
        </form>
      </section>
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-ink">Despesas</h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              Reembolsos pendentes ficam destacados até serem marcados.
            </p>
          </div>
          <span className="tag bg-surface-2 text-ink-muted">
            {expenses.length} lançamentos
          </span>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center">
            <IconWallet className="mx-auto h-8 w-8 text-brand-700" />
            <p className="mt-3 text-sm font-black text-ink">
              Nenhuma despesa registrada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[.08em] text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-black">Descrição</th>
                  <th className="px-4 py-3 font-black">Caso</th>
                  <th className="px-4 py-3 font-black">Data</th>
                  <th className="px-4 py-3 font-black">Valor</th>
                  <th className="px-4 py-3 font-black">Reembolso</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-50">
                    <td className="px-5 py-4">
                      <p className="max-w-[18rem] truncate text-sm font-black text-ink">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs font-bold text-ink-muted">
                        {EXPENSE_CATEGORY_LABEL[item.category]}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-ink-soft">
                      {item.case_id
                        ? (caseTitles.get(item.case_id) ?? "Caso removido")
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-ink-soft">
                      {new Intl.DateTimeFormat("pt-BR").format(
                        new Date(`${item.expense_date}T12:00:00`),
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-black text-ink">
                      {formatBRL(item.amount_cents)}
                    </td>
                    <td className="px-4 py-4">
                      {item.reimbursable ? (
                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-[11px] font-black " +
                            (item.reimbursed
                              ? "bg-success-50 text-success-700"
                              : "bg-warning-50 text-warning-700")
                          }
                        >
                          {item.reimbursed ? "Reembolsado" : "Pendente"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-black text-ink-muted">
                          Não reembolsável
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {item.reimbursable && (
                        <form action={toggleLegalExpenseReimbursed}>
                          <input type="hidden" name="id" value={item.id} />
                          <input
                            type="hidden"
                            name="reimbursed"
                            value={String(item.reimbursed)}
                          />
                          <PendingButton
                            className="nav-item rounded-md border border-line bg-surface px-3 py-2 text-xs font-black text-brand-700 hover:border-brand-300 hover:bg-brand-50"
                            pendingLabel="Salvando"
                          >
                            {item.reimbursed
                              ? "Desfazer"
                              : "Marcar reembolsado"}
                          </PendingButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
function Metric({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string;
  icon: (p: { className?: string }) => JSX.Element;
  danger?: boolean;
}) {
  return (
    <StatCard
      label={label}
      value={value}
      icon={Icon}
      tone={danger ? "danger" : "brand"}
    />
  );
}
function State({
  state,
}: {
  state: "paid" | "cancelled" | "overdue" | "partial" | "pending";
}) {
  const labels = {
    paid: "Recebido",
    cancelled: "Cancelado",
    overdue: "Vencido",
    partial: "Parcial",
    pending: "A vencer",
  };
  const colors = {
    paid: "bg-success-50 text-success-700",
    cancelled: "bg-surface-2 text-ink-muted",
    overdue: "bg-danger-50 text-danger-700",
    partial: "bg-warning-50 text-warning-700",
    pending: "bg-brand-50 text-brand-700",
  };
  return (
    <span
      className={
        "rounded-full px-2.5 py-1 text-[11px] font-black " + colors[state]
      }
    >
      {labels[state]}
    </span>
  );
}
function TextField({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  const id = `financial-${name}`;
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
        type={type}
        required={required}
        maxLength={type === "text" ? 180 : undefined}
        defaultValue={defaultValue}
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
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && (
          <>
            <span className="ml-1 text-brand-700">*</span>
            <span className="sr-only"> obrigatório</span>
          </>
        )}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="field mt-1.5"
      >
        <option value="">Selecione</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function AccessDenied() {
  return (
    <SectionCard className="max-w-xl">
      <PageHeader
        eyebrow="Acesso restrito"
        title="Seu cargo não acessa o financeiro."
        description="Um sócio administrador pode atribuir o cargo Financeiro à sua conta."
      />
    </SectionCard>
  );
}
function NotLawOffice() {
  return (
    <SectionCard className="max-w-xl">
      <PageHeader title="Financeiro jurídico disponível no workspace de advocacia." />
      <Link href="/dashboard" className="btn mt-4">
        Voltar ao painel
      </Link>
    </SectionCard>
  );
}
function Empty() {
  return (
    <EmptyState
      icon={IconWallet}
      title="Nenhuma conta a receber."
      hint="Crie um contrato de honorários para gerar as parcelas automaticamente."
    />
  );
}
