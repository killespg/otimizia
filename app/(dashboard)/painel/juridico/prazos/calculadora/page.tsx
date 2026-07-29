import { CalendarPlus } from "lucide-react";
import { DeadlineCalculator } from "@/components/legal/deadline-calculator";
import { LegalPage, PageHeader, PrimaryAction } from "@/components/legal/legal-ui";

export default function DeadlineCalculatorPage() {
  return <LegalPage><PageHeader eyebrow="Jurídico / Agenda e prazos" title="Calculadora de prazo" description="Conte dias úteis pelo CPC com memória clara dos dias desconsiderados. A data calculada exige revisão antes do cadastro." action={<PrimaryAction icon={CalendarPlus} href="/painel/juridico/prazos?novo=prazo">Cadastrar prazo</PrimaryAction>} /><DeadlineCalculator /></LegalPage>;
}

