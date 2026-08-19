"use client";

import { useState } from "react";
import { REAL_ESTATE_TRANSACTION_TYPES } from "@/lib/real-estate/real-estate";
import type { RealEstateTransactionType } from "@/lib/supabase/types";

export function FormSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-xs font-medium text-ink-muted">{description}</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

export function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
  hint,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="label">
        {label}
        {required && (
          <>
            <span className="ml-1 text-brand-700">*</span>
            <span className="sr-only"> obrigatório</span>
          </>
        )}
      </span>
      <input
        name={name}
        required={required}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="field mt-1.5"
      />
      {hint && <span className="mt-1 block text-xs font-medium text-ink-muted">{hint}</span>}
    </label>
  );
}

export function Select({
  name,
  label,
  options,
  required = false,
  defaultValue = "",
  hint,
  className = "",
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="label">{label}</span>
      <select name={name} required={required} defaultValue={defaultValue} className="field mt-1.5">
        {!defaultValue && (
          <option value="" disabled>
            Selecione
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs font-medium text-ink-muted">{hint}</span>}
    </label>
  );
}

// Segmentado em vez de <select>: a transação escolhida aqui decide, ao
// vivo, quais campos de preço abaixo fazem sentido — venda some o preço de
// aluguel e vice-versa, então precisa ser client component.
export function TransactionAndPriceFields({
  defaultTransactionType = "venda",
  defaultPrice = "",
  defaultRentPrice = "",
  defaultCondoFee = "",
  defaultIptu = "",
}: {
  defaultTransactionType?: RealEstateTransactionType;
  defaultPrice?: string;
  defaultRentPrice?: string;
  defaultCondoFee?: string;
  defaultIptu?: string;
}) {
  const [transactionType, setTransactionType] = useState<RealEstateTransactionType>(defaultTransactionType);
  const showSale = transactionType !== "aluguel";
  const showRent = transactionType !== "venda";

  return (
    <>
      <div className="block md:col-span-2">
        <span className="label">
          Transação<span className="ml-1 text-brand-700">*</span>
        </span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {REAL_ESTATE_TRANSACTION_TYPES.map((option) => {
            const active = option.value === transactionType;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTransactionType(option.value)}
                aria-pressed={active}
                className={
                  "press-sm min-h-11 rounded-[var(--radius-control)] border px-3 py-2.5 text-sm font-bold transition-colors " +
                  (active
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-line bg-surface text-ink-soft hover:bg-surface-2")
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="transaction_type" value={transactionType} />
      </div>
      {showSale && (
        <Field
          name="price"
          label="Preço de venda (R$)"
          placeholder="Ex.: 450000"
          defaultValue={defaultPrice}
          hint="Só números, sem R$ nem pontos — o sistema formata sozinho. Deixe em branco para “sob consulta”."
        />
      )}
      {showRent && (
        <Field
          name="rent_price"
          label="Preço de aluguel (R$)"
          placeholder="Ex.: 2500"
          defaultValue={defaultRentPrice}
          hint="Só números, sem R$ nem pontos."
        />
      )}
      <Field name="condo_fee" label="Condomínio (R$)" defaultValue={defaultCondoFee} />
      <Field name="iptu" label="IPTU (R$)" defaultValue={defaultIptu} />
    </>
  );
}
