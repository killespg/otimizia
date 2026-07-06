import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { getProfessionPreset } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Interaction, Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/format";
import { getWorkspaceKey } from "@/lib/workspaces";
import { Avatar } from "../../Avatar";
import {
  IconArrowRight,
  IconBell,
  IconCheck,
  IconMessage,
  IconPhone,
  IconPlus,
  IconTrash,
} from "../../icons";
import { createTask, updateContact, deleteContact, createInteraction } from "../../actions";
import { PresetFields } from "../../PresetFields";
import { MessageTemplates } from "./MessageTemplates";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("profession_type, name, is_admin").maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  const myName =
    profile?.name || (typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : "");

  if (!contact) notFound();
  const c = contact as Contact;
  const contactName = displayContactName(c);
  const now = new Date();

  const [{ data: interactions }, { data: tasks }] = await Promise.all([
    supabase
      .from("interactions")
      .select("*")
      .eq("contact_id", c.id)
      .eq("workspace_key", workspaceKey)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("contact_id", c.id)
      .eq("workspace_key", workspaceKey)
      .order("due_at", { ascending: true }),
  ]);

  const logs = (interactions ?? []) as Interaction[];
  const relatedTasks = (tasks ?? []) as Task[];
  const detailChips = preset.contactFields
    .map((field) => (c.details?.[field.key] ? `${field.label}: ${c.details[field.key]}` : null))
    .filter(Boolean) as string[];
  const chips = [c.company, c.phone, c.email, c.source, ...detailChips].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <Link
        href="/contacts"
        className="nav-item inline-flex items-center gap-2 text-sm font-black text-ink-muted hover:text-brand-700"
      >
        <IconArrowRight className="h-4 w-4 rotate-180" />
        Voltar para contatos
      </Link>

      <header className="enter panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={contactName} className="h-16 w-16 text-lg" />
          <div className="min-w-0">
            <p className="text-sm font-black text-brand-700">Contato</p>
            <h1 className="text-safe text-[clamp(2rem,5vw,3.3rem)] font-black leading-[0.98] tracking-[-0.04em] text-ink">
              {contactName}
            </h1>
            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span key={chip} className="tag bg-surface-2 text-ink-muted">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:w-64">
          <MiniStat label="Conversas" value={String(logs.length)} icon={IconMessage} />
          <MiniStat label="Lembretes" value={String(relatedTasks.length)} icon={IconBell} pink />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-lg font-black tracking-[-0.02em] text-ink">
              Dados do cliente
            </h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              Atualize os detalhes principais deste contato.
            </p>
          </div>

          <form action={updateContact} className="space-y-3.5 p-5">
            <input type="hidden" name="id" value={c.id} />
            <Field name="name" label="Nome" defaultValue={contactName} required maxLength={120} autoComplete="name" />
            <Field
              name="phone"
              label="Telefone / WhatsApp"
              defaultValue={c.phone ?? ""}
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
            />
            <Field name="email" label="E-mail" type="email" defaultValue={c.email ?? ""} maxLength={160} autoComplete="email" />
            <Field name="company" label="Empresa" defaultValue={c.company ?? ""} maxLength={120} autoComplete="organization" />
            <Field name="source" label="Origem" defaultValue={c.source ?? ""} maxLength={120} />
            <PresetFields fields={preset.contactFields} values={c.details} />
            <div>
              <label className="label" htmlFor="notes">
                Observações
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={c.notes ?? ""}
                maxLength={1200}
                className="field mt-1.5 min-h-[96px] resize-y"
              />
            </div>
            <PendingButton className="btn" pendingLabel="Salvando">
              <IconCheck className="h-4 w-4" />
              Salvar alterações
            </PendingButton>
          </form>

          <form
            action={deleteContact}
            className="flex items-center justify-between gap-3 border-t border-line bg-[#f8fbff] px-5 py-4"
          >
            <div>
              <p className="text-sm font-black text-ink">Excluir contato</p>
              <p className="text-sm font-medium text-ink-muted">
                Remove o cliente e as anotações.
              </p>
            </div>
            <input type="hidden" name="id" value={c.id} />
            <PendingButton
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-danger-200 bg-white px-3.5 py-2 text-sm font-black text-danger-700 hover:bg-danger-50"
              pendingLabel="Excluindo"
            >
              <IconTrash className="h-4 w-4" />
              Excluir
            </PendingButton>
          </form>
        </section>

        <div className="space-y-5">
          <MessageTemplates
            templates={preset.messageTemplates}
            contactName={contactName}
            contactPhone={c.phone}
            contactCompany={c.company}
            myName={myName}
          />

          {preset.followUpOffsets.length > 0 && (
            <section className="panel overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-lg font-black tracking-[-0.02em] text-ink">
                  Lembrete rápido
                </h2>
                <p className="mt-1 text-sm font-medium text-ink-muted">
                  Um toque para agendar o próximo retorno.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 p-5">
                {preset.followUpOffsets.map((offset) => (
                  <form key={offset.label} action={createTask}>
                    <input type="hidden" name="contact_id" value={c.id} />
                    <input type="hidden" name="return_to" value={`/contacts/${c.id}`} />
                    <input type="hidden" name="title" value={`Retornar para ${contactName}`} />
                    <input
                      type="hidden"
                      name="due_at"
                      value={new Date(now.getTime() + offset.days * 86_400_000).toISOString()}
                    />
                    <PendingButton
                      className="min-h-9 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                      pendingLabel="Agendando"
                    >
                      {offset.label}
                    </PendingButton>
                  </form>
                ))}
              </div>
            </section>
          )}

          <section className="panel overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-lg font-black tracking-[-0.02em] text-ink">
                Conversas
              </h2>
              <p className="mt-1 text-sm font-medium text-ink-muted">
                Anote ligações, mensagens e combinados.
              </p>
            </div>
            <div className="p-5">
              <form action={createInteraction} className="flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="contact_id" value={c.id} />
                <input
                  name="body"
                  required
                  maxLength={1200}
                  placeholder="Anote uma ligação, mensagem ou conversa..."
                  className="field flex-1"
                />
                <PendingButton className="btn shrink-0" aria-label="Salvar conversa" pendingLabel="Salvando">
                  <IconPlus className="h-4 w-4" />
                  Salvar
                </PendingButton>
              </form>

              {logs.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-line bg-[#f8fbff] p-5 text-center">
                  <IconMessage className="mx-auto h-7 w-7 text-brand-700" />
                  <p className="mt-3 text-sm font-black text-ink">
                    Nenhuma conversa anotada ainda.
                  </p>
                </div>
              ) : (
                <ol className="mt-5 space-y-3">
                  {logs.map((log) => (
                    <li key={log.id} className="rounded-lg border border-line bg-white p-4">
                      <p className="text-safe text-sm font-medium leading-relaxed text-ink">
                        {log.body}
                      </p>
                      <p className="mt-2 text-xs font-bold text-ink-muted">
                        {formatDateTime(log.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-lg font-black tracking-[-0.02em] text-ink">
                Lembretes deste cliente
              </h2>
            </div>
            <div className="px-5">
              {relatedTasks.length === 0 ? (
                <p className="py-5 text-sm font-medium text-ink-muted">
                  Nenhum lembrete.{" "}
                  <Link href="/tasks" className="nav-item font-black text-brand-700 hover:text-brand-900">
                    Criar um
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {relatedTasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-3 py-3">
                      <span
                        className={
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full " +
                          (task.done ? "bg-brand-700 text-white" : "border border-line bg-white")
                        }
                      >
                        {task.done && <IconCheck className="h-3 w-3" />}
                      </span>
                      <span
                        className={
                          "clip-2 min-w-0 flex-1 text-safe text-sm " +
                          (task.done ? "text-ink-muted line-through" : "font-black text-ink")
                        }
                      >
                        {task.title}
                      </span>
                      {task.due_at && (
                        <span className="shrink-0 text-xs font-bold tabular-nums text-ink-muted">
                          {formatDateTime(task.due_at)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  pink = false,
}: {
  label: string;
  value: string;
  icon: (props: { className?: string }) => JSX.Element;
  pink?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-[#f8fbff] p-3">
      <span
        className={
          "grid h-9 w-9 place-items-center rounded-full " +
          (pink ? "bg-[#fff7e6] text-[#8a6500]" : "bg-brand-50 text-brand-700")
        }
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-[11px] font-bold text-ink-muted">{label}</p>
      <p className="text-xl font-black text-ink">{value}</p>
    </div>
  );
}

type InputMode =
  | "none"
  | "text"
  | "tel"
  | "url"
  | "email"
  | "numeric"
  | "decimal"
  | "search";

function displayContactName(contact: Pick<Contact, "name">) {
  return typeof contact.name === "string" && contact.name.trim()
    ? contact.name
    : "Cliente sem nome";
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue = "",
  maxLength,
  autoComplete,
  inputMode,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: InputMode;
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
        type={type}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="field mt-1.5"
      />
    </div>
  );
}
