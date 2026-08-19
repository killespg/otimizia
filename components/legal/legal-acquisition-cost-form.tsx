"use client";

import { useActionState } from "react";
import { ActionDrawer } from "@/components/design-system/action-drawer";
import { PendingButton } from "@/components/ui/PendingButton";
import { Input, Textarea } from "@/components/ui/form-controls";
import { saveLegalAcquisitionCost } from "@/app/(dashboard)/painel/juridico/crm-actions";
import {
  initialLegalAcquisitionCostState,
  type LegalAcquisitionCostActionState,
} from "@/lib/law/legal-acquisition-cost";

export function LegalAcquisitionCostActionForm({
  initialState = initialLegalAcquisitionCostState,
}: {
  initialState?: LegalAcquisitionCostActionState;
}) {
  const [state, formAction] = useActionState<LegalAcquisitionCostActionState, FormData>(
    saveLegalAcquisitionCost,
    initialState,
  );

  return (
    <form key={state.revision} action={formAction} className="space-y-4">
      <Input
        name="month"
        type="month"
        label="Mês"
        defaultValue={state.values.month}
        required
      />
      <Input
        name="marketing"
        type="text"
        inputMode="decimal"
        label="Marketing (R$)"
        placeholder="0,00"
        defaultValue={state.values.marketing}
        required
      />
      <Input
        name="commercial"
        type="text"
        inputMode="decimal"
        label="Operação comercial (R$)"
        placeholder="0,00"
        defaultValue={state.values.commercial}
        required
      />
      <Textarea
        name="notes"
        label="Observações"
        maxLength={500}
        rows={4}
        defaultValue={state.values.notes}
      />
      {state.status !== "idle" ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live={state.status === "error" ? "assertive" : "polite"}
          className={state.status === "error"
            ? "rounded-[var(--radius-control)] bg-red-400/10 px-4 py-3 text-sm leading-relaxed text-red-200"
            : "rounded-[var(--radius-control)] bg-od-accent/10 px-4 py-3 text-sm leading-relaxed text-blue-200"}
        >
          {state.message}
        </p>
      ) : null}
      <PendingButton
        pendingLabel="Salvando"
        className="min-h-11 w-full sm:w-auto"
      >
        Salvar custos
      </PendingButton>
    </form>
  );
}

export function LegalAcquisitionCostForm() {
  return (
    <ActionDrawer
      label="Informar custos"
      title="Custos de aquisição"
      description="O CAC soma marketing e operação comercial e divide pelos contratos conquistados no mesmo período."
      triggerClassName="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-od-accent px-4 text-xs font-semibold text-white transition-colors hover:bg-od-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-accent focus-visible:ring-offset-2 focus-visible:ring-offset-od-bg"
    >
      <LegalAcquisitionCostActionForm />
    </ActionDrawer>
  );
}
