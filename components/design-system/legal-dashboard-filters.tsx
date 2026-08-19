"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

type FilterOption = { value: string; label: string };

export function LegalDashboardFilters({
  period,
  portfolio,
  area,
  areas,
}: {
  period: "7" | "30";
  portfolio: "mine" | "team";
  area: string;
  areas: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(name: string, value: string) {
    const next = new URLSearchParams();
    const values = { period, portfolio, area, [name]: value };
    if (values.period !== "7") next.set("period", values.period);
    if (values.portfolio !== "mine") next.set("portfolio", values.portfolio);
    if (values.area !== "all") next.set("area", values.area);
    const query = next.toString();
    startTransition(() => router.replace(query ? `/painel/juridico?${query}` : "/painel/juridico", { scroll: false }));
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${pending ? "opacity-65" : ""}`} aria-busy={pending}>
      <FilterSelect
        label="Período"
        value={period}
        options={[
          { value: "7", label: "Próximos 7 dias" },
          { value: "30", label: "Próximos 30 dias" },
        ]}
        onChange={(value) => update("period", value)}
      />
      <FilterSelect
        label="Carteira"
        value={portfolio}
        options={[
          { value: "mine", label: "Minha carteira" },
          { value: "team", label: "Toda a equipe" },
        ]}
        onChange={(value) => update("portfolio", value)}
      />
      <FilterSelect
        label="Área jurídica"
        value={area}
        options={[{ value: "all", label: "Todas as áreas" }, ...areas.map((item) => ({ value: item, label: item }))]}
        onChange={(value) => update("area", value)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value)?.label ?? value;

  return (
    <label className="relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--radius-control)] border border-od-border bg-od-surface px-3 text-[12px] font-medium text-od-text-2 transition-colors hover:border-od-border-hover hover:bg-od-surface-hover hover:text-od-text focus-within:border-od-focus focus-within:ring-2 focus-within:ring-od-focus/30">
      <span>{selected}</span>
      <ChevronDown size={12} />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 !size-full !min-h-0 cursor-pointer !border-0 !bg-transparent !p-0 opacity-0 !shadow-none"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
