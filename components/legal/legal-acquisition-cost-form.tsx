import { ActionDrawer } from "@/components/design-system/action-drawer";
import { PendingButton } from "@/components/ui/PendingButton";
import { Input, Textarea } from "@/components/ui/form-controls";
import { saveLegalAcquisitionCost } from "@/app/(dashboard)/painel/juridico/crm-actions";

export function LegalAcquisitionCostForm() {
  return (
    <ActionDrawer
      label="Informar custos"
      title="Custos de aquisição"
      description="O CAC soma marketing e operação comercial e divide pelos contratos conquistados no mesmo período."
      triggerClassName="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-od-accent px-4 text-xs font-semibold text-white transition-colors hover:bg-od-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-accent focus-visible:ring-offset-2 focus-visible:ring-offset-od-bg"
    >
      <form action={saveLegalAcquisitionCost} className="space-y-4">
        <Input
          name="month"
          type="month"
          label="Mês"
          required
        />
        <Input
          name="marketing"
          type="text"
          inputMode="decimal"
          label="Marketing (R$)"
          placeholder="0,00"
          required
        />
        <Input
          name="commercial"
          type="text"
          inputMode="decimal"
          label="Operação comercial (R$)"
          placeholder="0,00"
          required
        />
        <Textarea
          name="notes"
          label="Observações"
          maxLength={500}
          rows={4}
        />
        <PendingButton
          pendingLabel="Salvando"
          className="min-h-11 w-full sm:w-auto"
        >
          Salvar custos
        </PendingButton>
      </form>
    </ActionDrawer>
  );
}
