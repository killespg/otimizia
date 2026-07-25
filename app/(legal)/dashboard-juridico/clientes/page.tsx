import { Mail, Phone, Plus, Search, UserRoundCheck } from "lucide-react";
import { Avatar, LegalPage, MetricStrip, PageHeader, PrimaryAction, SectionTitle, StatusTag } from "@/components/legal/legal-ui";

const clients = [
  { initials: "ML", name: "Mariana Lopes", kind: "Pessoa física", contact: "mariana@exemplo.com", cases: 2, owner: "Marina Ribeiro", last: "Hoje, 09:00", status: "Ativo" },
  { initials: "CV", name: "Construtora Vale", kind: "Pessoa jurídica", contact: "juridico@construtoravale.com", cases: 4, owner: "Carlos Mendes", last: "Ontem, 16:42", status: "Ativo" },
  { initials: "PN", name: "Paulo Nogueira", kind: "Pessoa física", contact: "paulo.nogueira@exemplo.com", cases: 1, owner: "Aline Souza", last: "15 jul, 11:20", status: "Ativo" },
  { initials: "CV", name: "Comercial Vértice", kind: "Pessoa jurídica", contact: "diretoria@vertice.com", cases: 3, owner: "Marina Ribeiro", last: "12 jul, 14:05", status: "Atenção" },
  { initials: "HC", name: "Helena Costa", kind: "Pessoa física", contact: "helena.costa@exemplo.com", cases: 1, owner: "Aline Souza", last: "08 jul, 09:12", status: "Inativo" },
];

export default function ClientsPage() {
  return <LegalPage><PageHeader eyebrow="Jurídico / Clientes" title="Clientes" description="Relacionamento, histórico e carteira jurídica por cliente." action={<PrimaryAction icon={Plus} href="/painel/contatos?novo=cliente">Novo cliente</PrimaryAction>} /><MetricStrip items={[{ label: "Clientes ativos", value: "126", note: "+8 no mês" }, { label: "Pessoas jurídicas", value: "42" }, { label: "Sem retorno há 15 dias", value: "9", tone: "danger" }, { label: "Novos em julho", value: "11", tone: "success" }]} />
    <section className="py-8"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><SectionTitle title="Base de clientes" description="Contatos vinculados ao workspace law_office" /><div className="mb-6 flex items-center gap-2 border-b border-white/[0.07] pb-2"><Search size={13} className="text-white/28" /><span className="text-[11px] text-white/30">Buscar cliente</span></div></div>
      <div className="overflow-x-auto"><div className="min-w-[900px]"><div className="grid grid-cols-[1.2fr_1fr_.45fr_.75fr_.65fr_.55fr] gap-5 border-y border-white/[0.07] py-3 text-[9px] font-semibold uppercase tracking-[0.09em] text-white/25"><span>Cliente</span><span>Contato</span><span>Casos</span><span>Responsável</span><span>Última interação</span><span>Situação</span></div>{clients.map((client) => <div key={client.name} className="grid grid-cols-[1.2fr_1fr_.45fr_.75fr_.65fr_.55fr] items-center gap-5 border-b border-white/[0.055] py-4"><div className="flex items-center gap-3"><Avatar initials={client.initials} /><div><p className="text-[12px] font-medium text-white/76">{client.name}</p><p className="mt-1 text-[10px] text-white/28">{client.kind}</p></div></div><div><p className="truncate text-[10px] text-white/42">{client.contact}</p><div className="mt-2 flex gap-3 text-white/24"><Mail size={11} /><Phone size={11} /></div></div><span className="text-[12px] text-white/55">{client.cases}</span><span className="text-[11px] text-white/42">{client.owner}</span><span className="text-[10px] text-white/36">{client.last}</span><StatusTag tone={client.status === "Ativo" ? "success" : client.status === "Atenção" ? "warning" : "neutral"}>{client.status}</StatusTag></div>)}</div></div>
      <div className="mt-6 flex items-center gap-2 text-[10px] text-white/28"><UserRoundCheck size={12} />Dados isolados por organização e visíveis conforme o cargo do usuário.</div>
    </section>
  </LegalPage>;
}
