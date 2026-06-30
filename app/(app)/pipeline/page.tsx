import { createClient } from "@/lib/supabase/server";
import type { Contact, Deal } from "@/lib/supabase/types";
import { createDeal } from "../actions";
import { IconPlus } from "../icons";
import Board from "./Board";

export default async function PipelinePage() {
  const supabase = createClient();

  const [{ data: deals }, { data: contacts }] = await Promise.all([
    supabase.from("deals").select("*").order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, name").order("name"),
  ]);

  const allDeals = (deals ?? []) as Deal[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const contactNames = Object.fromEntries(
    allContacts.map((c) => [c.id, c.name])
  );

  return (
    <div>
      <header className="enter">
        <p className="eyebrow">Vendas</p>
        <h1 className="font-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
          Em que passo está cada venda
        </h1>
        <p className="mt-2 max-w-md text-[15px] text-ink-soft">
          Arraste uma venda para atualizar o próximo passo.
        </p>
      </header>

      {/* Nova venda */}
      <form action={createDeal} className="card mt-7 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="deal-title">
              Venda
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
              <option value="">—</option>
              {allContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn h-[42px] w-full sm:w-auto">
            <IconPlus className="h-4 w-4" />
            Salvar
          </button>
        </div>
      </form>

      <Board initialDeals={allDeals} contactNames={contactNames} />
    </div>
  );
}
