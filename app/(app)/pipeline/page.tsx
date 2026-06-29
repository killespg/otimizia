import { createClient } from "@/lib/supabase/server";
import type { Contact, Deal } from "@/lib/supabase/types";
import { createDeal } from "../actions";
import Board from "./Board";

export default async function PipelinePage() {
  const supabase = createClient();

  const [{ data: deals }, { data: contacts }] = await Promise.all([
    supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, name").order("name"),
  ]);

  const allDeals = (deals ?? []) as Deal[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const contactNames = Object.fromEntries(
    allContacts.map((c) => [c.id, c.name])
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Funil de vendas</h1>

        <form
          action={createDeal}
          className="glass flex flex-wrap items-end gap-2 p-3"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Negócio
            </label>
            <input
              name="title"
              required
              placeholder="Ex: Plano mensal"
              className="glass-input mt-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Valor (R$)
            </label>
            <input
              name="value"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="glass-input mt-1 w-28"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Contato
            </label>
            <select name="contact_id" className="glass-input mt-1">
              <option value="">—</option>
              {allContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button className="glass-btn">Adicionar</button>
        </form>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        Arraste os cartões entre as colunas para mudar a etapa.
      </p>

      <Board initialDeals={allDeals} contactNames={contactNames} />
    </div>
  );
}
