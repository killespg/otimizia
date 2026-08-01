import { PendingButton } from "@/components/ui/PendingButton";
import { getActiveOrgId } from "@/lib/workspace/org";
import { getProfessionPreset } from "@/lib/people/professions";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { getWorkspaceLabels } from "@/lib/workspace/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { createContact } from "../actions";
import { PresetFields } from "../PresetFields";
import { IconPlus } from "../icons";
import { ContactsExplorer } from "./ContactsExplorer";

export default async function ContactsPage(
  props: {
    searchParams?: Promise<{ q?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
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
  const orgId = await getActiveOrgId(supabase, user!.id);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  const [{ data }, { data: org }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("created_at", { ascending: false }),
    supabase
      .from("organizations")
      .select("workspace_preferences")
      .eq("id", orgId)
      .maybeSingle(),
  ]);
  const workspaceLabels = getWorkspaceLabels(
    preset,
    org?.workspace_preferences,
    workspaceKey
  );
  const isSeller = workspaceKey === "autonomous_seller";
  const isRealEstate = workspaceKey === "real_estate_broker";
  const allContacts = (data ?? []) as Contact[];

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <ContactsExplorer
        contacts={allContacts}
        initialQuery={initialQuery}
        title={workspaceLabels.contacts}
        description={preset.contactsDescription}
        newContactTitle={preset.newContactTitle}
        eyebrow={isSeller ? "Vendas / Clientes" : isRealEstate ? "Imobiliário / Clientes" : undefined}
        isSeller={isSeller}
        flat={isRealEstate}
      >
        <form action={createContact} className="space-y-4">
          <input type="hidden" name="return_to" value="/painel/contatos" />
          <Field name="name" label="Nome" required maxLength={120} autoComplete="name" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="phone" label="Telefone / WhatsApp" maxLength={40} autoComplete="tel" inputMode="tel" />
            <Field name="email" label="E-mail" type="email" maxLength={160} autoComplete="email" />
            <Field name="instagram" label="Instagram" maxLength={60} placeholder="@usuario" />
            <Field name="company" label="Empresa" maxLength={120} autoComplete="organization" />
            <Field name="source" label="Origem" maxLength={120} />
          </div>
          <PresetFields fields={preset.contactFields} />
          <div>
            <label className="label" htmlFor="notes">Observações</label>
            <textarea id="notes" name="notes" rows={4} maxLength={1200} className="field mt-1.5 min-h-28 resize-y" />
          </div>
          <div className="flex justify-end border-t border-od-border pt-5">
            <PendingButton className="btn" pendingLabel="Salvando">
              <IconPlus className="h-4 w-4" />
              Salvar cliente
            </PendingButton>
          </div>
        </form>
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
