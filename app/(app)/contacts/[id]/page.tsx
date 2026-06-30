import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Interaction, Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/format";
import { Avatar } from "../../Avatar";
import { IconArrowRight, IconPlus, IconTrash, IconCheck } from "../../icons";
import { updateContact, deleteContact, createInteraction } from "../../actions";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!contact) notFound();
  const c = contact as Contact;

  const [{ data: interactions }, { data: tasks }] = await Promise.all([
    supabase
      .from("interactions")
      .select("*")
      .eq("contact_id", c.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("contact_id", c.id)
      .order("due_at", { ascending: true }),
  ]);

  const logs = (interactions ?? []) as Interaction[];
  const relatedTasks = (tasks ?? []) as Task[];

  const chips = [c.company, c.phone, c.email, c.source].filter(
    Boolean
  ) as string[];

  return (
    <div>
      <Link
        href="/contacts"
        className="nav-item group inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
      >
        <IconArrowRight className="arrow-nudge h-3.5 w-3.5 rotate-180 group-hover:-translate-x-0.5" />
        Contatos
      </Link>

      {/* Cabeçalho do contato */}
      <div className="enter mt-4 flex items-center gap-4">
        <Avatar name={c.name} className="h-14 w-14 text-base" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-safe text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-[-0.02em] text-ink">
            {c.name}
          </h1>
          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="tag tag-muted max-w-full whitespace-normal text-safe normal-case tracking-normal"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Editar */}
        <div className="border border-line bg-surface">
          <div className="border-b border-line px-5 py-3">
            <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
              Dados
            </h2>
          </div>
          <form action={updateContact} className="space-y-3.5 p-5">
            <input type="hidden" name="id" value={c.id} />
            <Field
              name="name"
              label="Nome"
              defaultValue={c.name}
              required
              maxLength={120}
              autoComplete="name"
            />
            <Field
              name="phone"
              label="Telefone / WhatsApp"
              defaultValue={c.phone ?? ""}
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
            />
            <Field
              name="email"
              label="E-mail"
              type="email"
              defaultValue={c.email ?? ""}
              maxLength={160}
              autoComplete="email"
            />
            <Field
              name="company"
              label="Empresa"
              defaultValue={c.company ?? ""}
              maxLength={120}
              autoComplete="organization"
            />
            <Field
              name="source"
              label="Origem"
              defaultValue={c.source ?? ""}
              maxLength={120}
            />
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
            <button type="submit" className="btn">
              <IconCheck className="h-4 w-4" />
              Salvar
            </button>
          </form>

          {/* Zona de risco */}
          <form
            action={deleteContact}
            className="flex items-center justify-between gap-3 border-t border-line bg-surface-2 px-5 py-3.5"
          >
            <div>
              <p className="text-sm font-semibold text-ink">Excluir contato</p>
              <p className="text-[13px] text-ink-muted">
                Remove o cliente e as anotações.
              </p>
            </div>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              className="press inline-flex shrink-0 items-center gap-1.5 rounded border border-danger-200 bg-surface px-3.5 py-2 text-sm font-semibold text-danger-700 hover:bg-danger-50"
            >
              <IconTrash className="h-4 w-4" />
              Excluir
            </button>
          </form>
        </div>

        {/* Histórico + tarefas */}
        <div className="space-y-6 lg:space-y-8">
          <div className="border border-line bg-surface">
            <div className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
                Conversas
              </h2>
            </div>
            <div className="p-5">
              <form action={createInteraction} className="flex gap-2">
                <input type="hidden" name="contact_id" value={c.id} />
                <input
                  name="body"
                  required
                  maxLength={1200}
                  placeholder="Anote uma ligação, mensagem ou conversa..."
                  className="field flex-1"
                />
                <button
                  type="submit"
                  className="btn shrink-0"
                  aria-label="Salvar conversa"
                >
                  <IconPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Salvar</span>
                </button>
              </form>

              {logs.length === 0 ? (
                <p className="mt-5 text-sm text-ink-muted">
                  Nenhuma conversa anotada ainda.
                </p>
              ) : (
                <ol className="mt-5 border-l border-line">
                  {logs.map((l) => (
                    <li key={l.id} className="relative pb-5 pl-5 last:pb-0">
                      <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-sm border-2 border-surface bg-brand-500" />
                      <p className="text-safe text-[15px] leading-relaxed text-ink">
                        {l.body}
                      </p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                        {formatDateTime(l.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="border border-line bg-surface">
            <div className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
                Lembretes deste cliente
              </h2>
            </div>
            <div className="px-5">
              {relatedTasks.length === 0 ? (
                <p className="py-4 text-sm text-ink-muted">
                  Nenhum lembrete.{" "}
                  <Link
                    href="/tasks"
                    className="nav-item font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Criar um
                  </Link>
                </p>
              ) : (
                <ul>
                  {relatedTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                    >
                      <span
                        className={
                          "grid h-5 w-5 shrink-0 place-items-center rounded-sm " +
                          (t.done
                            ? "bg-brand-600 text-white"
                            : "border border-line")
                        }
                      >
                        {t.done && <IconCheck className="h-3 w-3" />}
                      </span>
                      <span
                        className={
                          "clip-2 min-w-0 flex-1 text-safe text-[15px] " +
                          (t.done
                            ? "text-ink-muted line-through"
                            : "font-medium text-ink")
                        }
                      >
                        {t.title}
                      </span>
                      {t.due_at && (
                        <span className="shrink-0 font-mono text-[12px] tabular-nums text-ink-muted">
                          {formatDateTime(t.due_at)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
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
