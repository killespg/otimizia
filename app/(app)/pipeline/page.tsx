import { PendingButton } from "@/components/PendingButton";
import { getProfessionPreset } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Deal } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/format";
import { createDeal } from "../actions";
import { IconColumns, IconPlus, IconUsers, IconWallet } from "../icons";
import { PresetFields } from "../PresetFields";
import Board from "./Board";

export default async function PipelinePage() {
  const supabase = createClient();

  const [
    {
      data: { user },
    },
    { data: profile },
    { data: deals },
    { data: contacts },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("profession_type").maybeSingle(),
    supabase.from("deals").select("*").order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, name").order("name"),
  ]);
  const preset = getProfessionPreset(
    profile?.profession_type ?? user?.user_metadata?.profession_type
  );

  const allDeals = (deals ?? []) as Deal[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const contactNames = Object.fromEntries(
    allContacts.map((contact) => [contact.id, contact.name])
  );
  const openDeals = allDeals.filter(
    (deal) => deal.stage !== "ganho" && deal.stage !== "perdido"
  );
  const openValue = openDeals.reduce((sum, deal) => sum + deal.value_cents, 0);
  const wonValue = allDeals
    .filter((deal) => deal.stage === "ganho")
    .reduce((sum, deal) => sum + deal.value_cents, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">{preset.pipelineLabel}</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,3.2rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            {preset.pipelineTitle}
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm font-medium leading-relaxed text-ink-soft sm:block">
            {preset.pipelineDescription}
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard label="Abertas" value={String(openDeals.length)} icon={IconColumns} />
        <MetricCard label={preset.valueLabel} value={formatBRL(openValue)} icon={IconWallet} />
        <MetricCard label={preset.wonLabel} value={formatBRL(wonValue)} icon={IconUsers} pink />
      </section>

      <form action={createDeal} className="panel p-4 sm:p-5">
        <input type="hidden" name="return_to" value="/pipeline" />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="deal-title">
              {preset.dealFieldLabel}
              <span className="ml-1 text-brand-700" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> obrigatório</span>
            </label>
            <input
              id="deal-title"
              name="title"
              required
              maxLength={160}
              placeholder={preset.dealPlaceholder}
              className="field mt-1.5"
            />
          </div>
          <div>
            <label className="label" htmlFor="deal-value">
              Valor (R$)
            </label>
            <input
              id="deal-value"
              name="value"
              type="text"
              inputMode="decimal"
              maxLength={32}
              placeholder="0,00"
              className="field mt-1.5"
            />
          </div>
          <div>
            <label className="label" htmlFor="deal-contact">
              Contato
            </label>
            <select id="deal-contact" name="contact_id" className="field mt-1.5">
              <option value="">Sem contato</option>
              {allContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </div>
          <PendingButton className="btn h-[42px] w-full lg:w-auto" pendingLabel="Salvando">
            <IconPlus className="h-4 w-4" />
            Salvar
          </PendingButton>
        </div>

        {preset.dealFields.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PresetFields fields={preset.dealFields} />
          </div>
        )}
      </form>

      <Board
        initialDeals={allDeals}
        contactNames={contactNames}
        stages={preset.stages}
        dealFields={preset.dealFields}
      />
    </div>
  );
}

function MetricCard({
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
    <article className="panel p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink-soft sm:text-sm">{label}</p>
          <p className="text-safe mt-0.5 text-xl font-black tracking-[-0.04em] text-ink sm:mt-3 sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          className={
            "hidden h-9 w-9 shrink-0 place-items-center rounded-full sm:grid sm:h-11 sm:w-11 " +
            (pink ? "bg-pink-100 text-pink-600" : "bg-brand-50 text-brand-700")
          }
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>
    </article>
  );
}
