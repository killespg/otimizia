import type { ProfessionPreset } from "@/lib/people/professions";
import { formatBRL } from "@/lib/utils/format";
import type { ContactOption } from "../dashboard-format";
import { ReminderModal as ReminderModalClient } from "../ReminderModal";
import { RevenueLineChart } from "../RevenueLineChart";

export function RevenueChart({
  openValue,
  wonValue,
  series,
  contacts,
  defaultDueAt,
  preset,
}: {
  openValue: number;
  wonValue: number;
  series: { day: number; cumulativeCents: number }[];
  contacts: ContactOption[];
  defaultDueAt: string;
  preset: ProfessionPreset;
}) {
  return (
    <section
      id="valor"
      className="enter relative overflow-hidden rounded-md border border-od-border bg-od-surface p-4 sm:min-h-[382px] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Receita</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-od-text sm:text-lg">
            {preset.wonLabel} no mês (R$)
          </h2>
          <p className="mt-1 text-xs font-medium text-od-text-3 sm:text-sm">
            Total aberto: {formatBRL(openValue)} - recebido no mês:{" "}
            {formatBRL(wonValue)}
          </p>
        </div>
      </div>

      <RevenueLineChart series={series} />

      <ReminderModalClient contacts={contacts} defaultDueAt={defaultDueAt} />
    </section>
  );
}
