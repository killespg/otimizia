import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { createContact } from "../actions";

export default async function ContactsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });
  const contacts = (data ?? []) as Contact[];

  return (
    <div>
      <h1 className="text-2xl font-bold">Contatos</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {contacts.length === 0 ? (
            <p className="glass-soft border-dashed p-8 text-center text-sm text-slate-500">
              Nenhum contato ainda. Adicione o primeiro ao lado.
            </p>
          ) : (
            <ul className="glass divide-y divide-white/40 overflow-hidden">
              {contacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contacts/${c.id}`}
                    className="flex items-center justify-between px-5 py-4 transition hover:bg-white/40"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-sm text-slate-500">
                        {c.company || c.email || c.phone || "—"}
                      </p>
                    </div>
                    <span className="text-sm text-brand-600">Ver →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass p-5">
          <h2 className="font-semibold text-slate-900">Novo contato</h2>
          <form action={createContact} className="mt-4 space-y-3">
            <Field name="name" label="Nome" required />
            <Field name="phone" label="Telefone / WhatsApp" />
            <Field name="email" label="E-mail" type="email" />
            <Field name="company" label="Empresa" />
            <Field name="source" label="Origem (ex: Instagram)" />
            <div>
              <label className="block text-sm font-medium">Observações</label>
              <textarea name="notes" rows={2} className="glass-input mt-1" />
            </div>
            <button className="glass-btn w-full py-2.5">Adicionar</button>
          </form>
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="glass-input mt-1"
      />
    </div>
  );
}
