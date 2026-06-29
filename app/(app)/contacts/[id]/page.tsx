import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Interaction, Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/format";
import {
  updateContact,
  deleteContact,
  createInteraction,
} from "../../actions";

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

  return (
    <div>
      <Link href="/contacts" className="text-sm text-brand-600">
        ← Contatos
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{c.name}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Editar */}
        <div className="glass p-5">
          <h2 className="font-semibold text-slate-900">Dados do contato</h2>
          <form action={updateContact} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={c.id} />
            <Field name="name" label="Nome" defaultValue={c.name} required />
            <Field
              name="phone"
              label="Telefone / WhatsApp"
              defaultValue={c.phone ?? ""}
            />
            <Field
              name="email"
              label="E-mail"
              type="email"
              defaultValue={c.email ?? ""}
            />
            <Field
              name="company"
              label="Empresa"
              defaultValue={c.company ?? ""}
            />
            <Field
              name="source"
              label="Origem"
              defaultValue={c.source ?? ""}
            />
            <div>
              <label className="block text-sm font-medium">Observações</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={c.notes ?? ""}
                className="glass-input mt-1"
              />
            </div>
            <button className="glass-btn">Salvar</button>
          </form>

          <form action={deleteContact} className="mt-4 border-t border-white/40 pt-4">
            <input type="hidden" name="id" value={c.id} />
            <button className="text-sm text-red-600 hover:underline">
              Excluir contato
            </button>
          </form>
        </div>

        {/* Histórico + tarefas */}
        <div className="space-y-8">
          <div className="glass p-5">
            <h2 className="font-semibold text-slate-900">
              Histórico de interações
            </h2>
            <form action={createInteraction} className="mt-4 flex gap-2">
              <input type="hidden" name="contact_id" value={c.id} />
              <input
                name="body"
                required
                placeholder="Registrar uma conversa, ligação, mensagem..."
                className="glass-input flex-1"
              />
              <button className="glass-btn whitespace-nowrap">Registrar</button>
            </form>
            {logs.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Nenhuma interação registrada.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {logs.map((l) => (
                  <li key={l.id} className="text-sm">
                    <p>{l.body}</p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(l.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass p-5">
            <h2 className="font-semibold text-slate-900">
              Tarefas deste contato
            </h2>
            {relatedTasks.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Nenhuma tarefa.{" "}
                <Link href="/tasks" className="text-brand-600">
                  Criar uma
                </Link>
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {relatedTasks.map((t) => (
                  <li key={t.id} className="flex justify-between">
                    <span className={t.done ? "text-gray-400 line-through" : ""}>
                      {t.title}
                    </span>
                    <span className="text-gray-400">
                      {t.due_at ? formatDateTime(t.due_at) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="glass-input mt-1"
      />
    </div>
  );
}
