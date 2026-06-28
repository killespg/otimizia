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
          className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-3"
        >
          <div>
            <label className="block text-xs font-medium">Negócio</label>
            <input
              name="title"
              required
              placeholder="Ex: Plano mensal"
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Valor (R$)</label>
            <input
              name="value"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="mt-1 w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Contato</label>
            <select
              name="contact_id"
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {allContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Adicionar
          </button>
        </form>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Arraste os cartões entre as colunas para mudar a etapa.
      </p>

      <Board initialDeals={allDeals} contactNames={contactNames} />
    </div>
  );
}
