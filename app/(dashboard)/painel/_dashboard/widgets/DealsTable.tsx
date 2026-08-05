import Link from "next/link";
import type { ProfessionPreset } from "@/lib/people/professions";
import type { Deal } from "@/lib/supabase/types";
import { formatBRL, formatDate } from "@/lib/utils/format";
import { IconArrowRight } from "../../icons";
import { stageMeta, type ContactOption } from "../dashboard-format";

export function DealsTable({
  deals,
  contactMap,
  preset,
}: {
  deals: Deal[];
  contactMap: Map<string, ContactOption>;
  preset: ProfessionPreset;
}) {
  const recent = deals.slice(0, 4);

  return (
    <section className="enter rounded-md border border-od-border bg-od-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Pipeline</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-od-text sm:text-lg">
            Negócios recentes
          </h2>
        </div>
        <Link
          href="/painel/funil"
          className="nav-item inline-flex items-center gap-1 text-sm font-black text-brand-700 hover:text-brand-900"
        >
          Ver todos
          <IconArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-od-border bg-od-muted-surface px-3 py-8 text-center text-sm font-medium text-od-text-3">
          Nenhum negócio aberto ainda.
        </p>
      ) : (
        <>
          {/* Celular: cada negócio vira um card empilhado (a tabela larga
              nao cabe na tela e virava scroll horizontal). */}
          <ul className="mt-4 space-y-2 sm:hidden">
            {recent.map((deal) => {
              const stage = stageMeta(deal.stage, preset);
              const contact = deal.contact_id ? contactMap.get(deal.contact_id) : null;
              return (
                <li
                  key={deal.id}
                  className="rounded-md border border-od-border bg-od-surface p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="clip-2 text-safe min-w-0 text-sm font-black leading-snug text-od-text">
                      {deal.title}
                    </p>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${stage.className}`}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-od-text-3">
                      {contact?.company ?? contact?.name ?? "Sem contato"}
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-brand-700">
                      {formatBRL(deal.value_cents ?? 0)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-od-text-3">
                    {formatDate(deal.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>

          {/* Tablet/desktop: tabela completa. */}
          <div className="mt-4 hidden overflow-x-auto rounded-md border border-od-border sm:block">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="bg-od-muted-surface">
                <tr className="text-xs font-bold text-od-text-3">
                  <th className="px-3 py-3">Negócio</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Etapa</th>
                  <th className="px-3 py-3">Valor</th>
                  <th className="px-3 py-3">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-od-surface">
                {recent.map((deal) => {
                  const stage = stageMeta(deal.stage, preset);
                  const contact = deal.contact_id ? contactMap.get(deal.contact_id) : null;
                  return (
                    <tr key={deal.id} className="text-xs font-semibold text-od-text-2">
                      <td className="px-3 py-3 text-od-text">{deal.title}</td>
                      <td className="px-3 py-3">
                        {contact?.company ?? contact?.name ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-black ${stage.className}`}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">{formatBRL(deal.value_cents ?? 0)}</td>
                      <td className="px-3 py-3">{formatDate(deal.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
