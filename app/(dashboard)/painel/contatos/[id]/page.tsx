import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/ui/PendingButton";
import { getProfessionPreset } from "@/lib/people/professions";
import { isRealEstateV2Enabled } from "@/lib/real-estate/real-estate";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Deal, Interaction, RealEstateLeadPreferences, SellerCustomerProfile, Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils/format";
import { getActiveOrgId } from "@/lib/workspace/org";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { Avatar } from "../../Avatar";
import {
  IconArrowRight,
  IconBell,
  IconCheck,
  IconMessage,
  IconPlus,
  IconTrash,
} from "../../icons";
import { createTask, updateContact, deleteContact, createInteraction } from "../../actions";
import { PresetFields } from "../../PresetFields";
import { LeadPreferencesForm } from "./LeadPreferencesForm";
import { MessageTemplates } from "./MessageTemplates";
import { updateSellerCustomerProfile } from "../../operacao/actions";

export default async function ContactDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("profession_type, name, is_admin").maybeSingle(),
  ]);
  const orgId = await getActiveOrgId(supabase, user!.id);
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
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  const myName =
    profile?.name || (typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : "");

  if (!contact) notFound();
  const c = contact as Contact;
  const contactName = displayContactName(c);
  const now = new Date();
  const copy = contactDetailCopy(preset.key === "livestock_producer");

  const isRealEstate = workspaceKey === "real_estate_broker";
  const isSeller = workspaceKey === "autonomous_seller";
  const usesFlatSurface = isSeller || isRealEstate;
  const [{ data: interactions }, { data: tasks }, { data: dealRows }, { data: org }, { data: sellerCustomerProfile }] = await Promise.all([
    supabase
      .from("interactions")
      .select("*")
      .eq("contact_id", c.id)
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("contact_id", c.id)
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("due_at", { ascending: true }),
    isRealEstate
      ? supabase
          .from("deals")
          .select("id, title, stage")
          .eq("contact_id", c.id)
          .eq("org_id", orgId)
          .eq("workspace_key", workspaceKey)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Pick<Deal, "id" | "title" | "stage">[] }),
    isRealEstate
      ? supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle()
      : Promise.resolve({ data: null }),
    isSeller
      ? supabase.from("seller_customer_profiles").select("*").eq("org_id", orgId).eq("contact_id", c.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const logs = (interactions ?? []) as Interaction[];
  const relatedTasks = (tasks ?? []) as Task[];
  const contactDeals = (dealRows ?? []) as Pick<Deal, "id" | "title" | "stage">[];
  const showLeadPreferences = isRealEstate && isRealEstateV2Enabled(org) && contactDeals.length > 0;
  const dealIds = contactDeals.map((d) => d.id);
  const { data: preferenceRows } = showLeadPreferences
    ? await supabase.from("real_estate_lead_preferences").select("*").eq("org_id", orgId).in("deal_id", dealIds)
    : { data: [] as RealEstateLeadPreferences[] };
  const preferencesByDeal = new Map(
    ((preferenceRows ?? []) as RealEstateLeadPreferences[]).map((p) => [p.deal_id, p])
  );
  const detailChips = preset.contactFields
    .map((field) => (c.details?.[field.key] ? `${field.label}: ${c.details[field.key]}` : null))
    .filter(Boolean) as string[];
  const chips = [c.company, c.phone, c.email, c.source, ...detailChips].filter(Boolean) as string[];

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <Link
        href="/painel/contatos"
        className="inline-flex items-center gap-2 text-xs font-semibold text-od-text-2 hover:text-od-text"
      >
        <IconArrowRight className="h-4 w-4 rotate-180" />
        {copy.backLabel}
      </Link>

      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={contactName} className="size-12 text-sm" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-od-text-2">{copy.sectionSingular}</p>
            <h1 className="text-safe mt-2 text-od-title text-white">
              {contactName}
            </h1>
            {(chips.length > 0 || c.instagram) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.instagram && (
                  <a
                    href={`https://instagram.com/${c.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tag bg-surface-2 text-ink-muted hover:text-brand-700"
                  >
                    @{c.instagram}
                  </a>
                )}
                {chips.map((chip) => (
                  <span key={chip} className="tag bg-surface-2 text-ink-muted">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="enter grid grid-cols-2 gap-2 sm:w-64">
          <MiniStat label="Conversas" value={String(logs.length)} icon={IconMessage} />
          <MiniStat label="Tarefas" value={String(relatedTasks.length)} icon={IconBell} pink />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className={usesFlatSurface ? "overflow-hidden border-y border-white/[0.08]" : "panel overflow-hidden"}>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-lg font-black tracking-[-0.02em] text-ink">
              {copy.dataTitle}
            </h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              {copy.dataDescription}
            </p>
          </div>

          <form action={updateContact} className="space-y-3.5 p-5">
            <input type="hidden" name="id" value={c.id} />
            <Field name="name" label="Nome" defaultValue={contactName} required maxLength={120} autoComplete="name" />
            <Field
              name="phone"
              label={copy.phoneField}
              defaultValue={c.phone ?? ""}
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
            />
            {c.phone && (
              <label className="flex items-center gap-2 text-sm font-bold text-ink">
                <input
                  type="checkbox"
                  name="whatsapp_opt_out"
                  defaultChecked={c.whatsapp_opt_out}
                  className="h-4 w-4 rounded border-line"
                />
                Não mandar mensagens automáticas de WhatsApp pra este contato
              </label>
            )}
            <Field name="email" label="E-mail" type="email" defaultValue={c.email ?? ""} maxLength={160} autoComplete="email" />
            <Field name="instagram" label="Instagram" defaultValue={c.instagram ?? ""} maxLength={60} placeholder="@usuario" />
            <Field name="company" label={copy.companyField} defaultValue={c.company ?? ""} maxLength={120} autoComplete="organization" />
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
            className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-5 py-4"
          >
            <div>
              <p className="text-sm font-black text-ink">{copy.deleteTitle}</p>
              <p className="text-sm font-medium text-ink-muted">
                {copy.deleteDescription}
              </p>
            </div>
            <input type="hidden" name="id" value={c.id} />
            <PendingButton
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-2 text-sm font-black text-danger-700 hover:bg-danger-100"
              pendingLabel="Excluindo"
            >
              <IconTrash className="h-4 w-4" />
              Excluir
            </PendingButton>
          </form>
        </section>

        <div className="space-y-5">
          {isSeller ? (
            <section className="overflow-hidden border-y border-white/[0.08]">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <h2 className="text-base font-semibold text-white">Preferências de compra</h2>
                <p className="mt-1 text-sm text-white/52">Tamanhos, medidas e hábitos para atender e recomprar sem perguntar tudo de novo.</p>
              </div>
              <form action={updateSellerCustomerProfile} className="grid gap-4 p-5 sm:grid-cols-2">
                <input type="hidden" name="contact_id" value={c.id} />
                <label><span className="label">Tamanhos de roupa</span><input name="clothing_sizes" defaultValue={keyValueText((sellerCustomerProfile as SellerCustomerProfile | null)?.clothing_sizes)} placeholder="Camiseta: M, Calça: 40" className="field mt-1.5" /></label>
                <label><span className="label">Medidas</span><input name="measurements" defaultValue={keyValueText((sellerCustomerProfile as SellerCustomerProfile | null)?.measurements)} placeholder="Busto: 92 cm, Cintura: 76 cm" className="field mt-1.5" /></label>
                <label><span className="label">Cores preferidas</span><input name="preferred_colors" defaultValue={(sellerCustomerProfile as SellerCustomerProfile | null)?.preferred_colors?.join(", ") ?? ""} placeholder="Preto, azul, bege" className="field mt-1.5" /></label>
                <label><span className="label">Número do calçado</span><input name="shoe_size" type="number" min="20" max="60" step="0.5" defaultValue={(sellerCustomerProfile as SellerCustomerProfile | null)?.shoe_size ?? ""} className="field mt-1.5" /></label>
                <label><span className="label">Recompra esperada</span><input name="reorder_interval_days" type="number" min="1" max="3650" defaultValue={(sellerCustomerProfile as SellerCustomerProfile | null)?.reorder_interval_days ?? ""} placeholder="Dias" className="field mt-1.5" /></label>
                <label className="sm:col-span-2"><span className="label">Estilo e observações</span><textarea name="style_notes" rows={3} maxLength={2000} defaultValue={(sellerCustomerProfile as SellerCustomerProfile | null)?.style_notes ?? ""} placeholder="Preferências de modelagem, alergias, marcas ou detalhes importantes" className="field mt-1.5 resize-y" /></label>
                <div className="sm:col-span-2"><PendingButton className="btn" pendingLabel="Salvando"><IconCheck className="h-4 w-4" /> Salvar preferências</PendingButton></div>
              </form>
            </section>
          ) : null}

          {showLeadPreferences && (
            <section className="overflow-hidden border-y border-white/[0.08]">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-lg font-black tracking-[-0.02em] text-ink">Perfil de busca do cliente</h2>
                <p className="mt-1 text-sm font-medium text-ink-muted">
                  Uma preferência por atendimento — usada pra encontrar imóveis compatíveis na carteira.
                </p>
              </div>
              <div className="space-y-3 p-5">
                {contactDeals.map((deal) => (
                  <LeadPreferencesForm
                    key={deal.id}
                    deal={deal}
                    contactId={c.id}
                    preferences={preferencesByDeal.get(deal.id) ?? null}
                  />
                ))}
              </div>
            </section>
          )}

          <MessageTemplates
            templates={preset.messageTemplates}
            contactName={contactName}
            contactPhone={c.phone}
            contactCompany={c.company}
            myName={myName}
            flat={usesFlatSurface}
          />

          {preset.followUpOffsets.length > 0 && (
            <section className={usesFlatSurface ? "overflow-hidden border-y border-white/[0.08]" : "panel overflow-hidden"}>
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
                    <input type="hidden" name="return_to" value={`/painel/contatos/${c.id}`} />
                    <input type="hidden" name="title" value={`Retornar para ${contactName}`} />
                    <input
                      type="hidden"
                      name="due_at"
                      value={new Date(now.getTime() + offset.days * 86_400_000).toISOString()}
                    />
                    <PendingButton
                      className="press-sm min-h-9 rounded-md border border-line bg-transparent px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors duration-150 ease-out hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                      pendingLabel="Agendando"
                    >
                      {offset.label}
                    </PendingButton>
                  </form>
                ))}
              </div>
            </section>
          )}

          <section className={usesFlatSurface ? "overflow-hidden border-y border-white/[0.08]" : "panel overflow-hidden"}>
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
                <div className="mt-5 py-5 text-left">
                  <IconMessage className="mx-auto h-7 w-7 text-brand-700" />
                  <p className="mt-3 text-sm font-black text-ink">
                    Nenhuma conversa anotada ainda.
                  </p>
                </div>
              ) : (
                <ol className="enter mt-5 divide-y divide-white/[0.08] border-y border-white/[0.08]">
                  {logs.map((log) => (
                    <li key={log.id} className="py-4">
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

          <section className={usesFlatSurface ? "overflow-hidden border-y border-white/[0.08]" : "panel overflow-hidden"}>
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-lg font-black tracking-[-0.02em] text-ink">
                {copy.tasksTitle}
              </h2>
            </div>
            <div className="px-5">
              {relatedTasks.length === 0 ? (
                <p className="py-5 text-sm font-medium text-ink-muted">
                  Nenhum lembrete.{" "}
                  <Link href="/painel/tarefas" className="nav-item font-black text-brand-700 hover:text-brand-900">
                    Criar um
                  </Link>
                </p>
              ) : (
                <ul className="enter divide-y divide-line">
                  {relatedTasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-3 py-3">
                      <span
                        className={
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full " +
                          (task.done ? "bg-brand-700 text-white" : "border border-line bg-transparent")
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
  icon: (props: { className?: string }) => React.ReactElement;
  pink?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-l border-white/[0.08] px-3 py-2">
      <Icon className={`h-4 w-4 ${pink ? "text-amber-300" : "text-od-text-2"}`} />
      <div><p className="text-xs text-od-text-3">{label}</p><p className="text-[18px] font-bold text-white">{value}</p></div>
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

function keyValueText(value?: Record<string, string> | null) {
  return Object.entries(value ?? {}).map(([key, item]) => `${key}: ${item}`).join(", ");
}

function contactDetailCopy(isLivestock: boolean) {
  if (isLivestock) {
    return {
      backLabel: "Voltar para sujeitos",
      sectionSingular: "Sujeito",
      dataTitle: "Dados do sujeito",
      dataDescription: "Atualize as informações principais deste sujeito.",
      phoneField: "Telefone / WhatsApp",
      companyField: "Origem",
      deleteTitle: "Excluir sujeito",
      deleteDescription: "Remove o sujeito e as anotações.",
      tasksTitle: "Tarefas deste sujeito",
    };
  }

  return {
    backLabel: "Voltar para contatos",
    sectionSingular: "Contato",
    dataTitle: "Dados do cliente",
    dataDescription: "Atualize os detalhes principais deste contato.",
    phoneField: "Telefone / WhatsApp",
    companyField: "Empresa",
    deleteTitle: "Excluir contato",
    deleteDescription: "Remove o cliente e as anotações.",
    tasksTitle: "Tarefas deste cliente",
  };
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
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        className="field mt-1.5"
      />
    </div>
  );
}
