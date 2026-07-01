import { PendingButton } from "@/components/PendingButton";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Deal } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/format";
import { createDeal } from "../actions";
import { IconColumns, IconPlus, IconUsers, IconWallet } from "../icons";
import Board from "./Board";

export default async function PipelinePage() {
  const supabase = createClient();

  const [{ data: deals }, { data: contacts }] = await Promise.all([
    supabase.from("deals").select("*").order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, name").order("name"),
  ]);

  const allDeals = (deals ?? []) as Deal[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const contactNames = Object.fromEntries(allContacts.map((contact) => [contact.id, contact.name]));
  const openDeals = allDeals.filter((deal) => deal.stage !== "ganho" && deal.stage !== "perdido");
  const openValue = openDeals.reduce((sum, deal) => sum + deal.value_cents, 0);
  const wonValue = allDeals
    .filter((deal) => deal.stage === "ganho")
    .reduce((sum, deal) => sum + deal.value_cents, 0);

  return (
    <div className="space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Vendas</p>
          <h1 className="mt-2 text-[clamp(2rem,5vw,3.2rem)] font-black leading-[0.98] tracking-[-0.04em] text-ink">
            Negócios em andamento
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-soft">
            Mova cada venda por etapa e mantenha o próximo passo visível.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Abertas" value={String(openDeals.length)} icon={IconColumns} />
        <MetricCard label="Valor aberto" value={formatBRL(openValue)} icon={IconWallet} />
        <MetricCard label="Ganhas" value={formatBRL(wonValue)} icon={IconUsers} pink />
      </section>

      <form action={createDeal} className="panel p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="deal-title">
              Venda
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
              placeholder="Ex: Plano mensal"
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
      </form>

      <Board initialDeals={allDeals} contactNames={contactNames} />
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
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-soft">{label}</p>
          <p className="text-safe mt-3 text-2xl font-black tracking-[-0.04em] text-ink sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          className={
            "grid h-11 w-11 shrink-0 place-items-center rounded-full " +
            (pink ? "bg-pink-100 text-pink-600" : "bg-brand-50 text-brand-700")
          }
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}
