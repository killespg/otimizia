import { PendingButton } from "@/components/PendingButton";
import { getProfessionPreset } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { createContact } from "../actions";
import { PresetFields } from "../PresetFields";
import { IconPlus } from "../icons";
import { ContactsExplorer } from "./ContactsExplorer";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const supabase = createClient();
  const initialQuery = normalizeSearch(searchParams?.q);
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("workspace_key", workspaceKey)
    .order("created_at", { ascending: false });
  const allContacts = (data ?? []) as Contact[];

  return (
    <div className="space-y-4 sm:space-y-5">
      <ContactsExplorer
        contacts={allContacts}
        initialQuery={initialQuery}
        title={preset.contactsTitle}
        description={preset.contactsDescription}
      >
        <section className="panel order-1 h-max p-5 xl:sticky xl:top-8 xl:order-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700">
              <IconPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
                {preset.newContactTitle}
              </h2>
              <p className="text-sm font-medium text-ink-muted">Adicione em poucos campos.</p>
            </div>
          </div>

          <form action={createContact} className="mt-5 space-y-3.5">
            <input type="hidden" name="return_to" value="/contacts" />
            <Field name="name" label="Nome" required maxLength={120} autoComplete="name" />
            <Field
              name="phone"
              label="Telefone / WhatsApp"
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
            />
            <Field name="email" label="E-mail" type="email" maxLength={160} autoComplete="email" />
            <Field name="instagram" label="Instagram" maxLength={60} placeholder="@usuario" />
            <Field name="company" label="Empresa" maxLength={120} autoComplete="organization" />
            <Field name="source" label="Origem" maxLength={120} />
            <PresetFields fields={preset.contactFields} />
            <div>
              <label className="label" htmlFor="notes">
                Observações
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={1200}
                className="field mt-1.5 min-h-[88px] resize-y"
              />
            </div>
            <PendingButton className="btn w-full" pendingLabel="Salvando">
              <IconPlus className="h-4 w-4" />
              Salvar cliente
            </PendingButton>
          </form>
        </section>
      </ContactsExplorer>
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

function normalizeSearch(value: string | undefined) {
  return value?.trim().slice(0, 80) ?? "";
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  maxLength,
  autoComplete,
  inputMode,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: InputMode;
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
        type={type}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        className="field mt-1.5"
      />
    </div>
  );
}
