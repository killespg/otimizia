import { DatabaseSearch } from "lucide-react";
import { DatajudSearch } from "@/components/legal/datajud-search";
import { LegalPage, PageHeader, QuietAction } from "@/components/legal/legal-ui";

export default function DatajudPage() {
  return <LegalPage><PageHeader eyebrow="Jurídico / Pesquisa processual" title="Consulta DataJud" description="Localize processos nos tribunais, confira movimentações oficiais e adicione o resultado à carteira." action={<QuietAction icon={DatabaseSearch} href="/painel/juridico/processos?visao=movimentacoes">Ver monitoramento</QuietAction>} /><DatajudSearch /></LegalPage>;
}

