"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { LegalSettingsMenu } from "@/components/legal/legal-settings-menu";
import { LegalPage, PageHeader, PrimaryAction, SectionTitle, StatusTag } from "@/components/legal/legal-ui";

const fieldClass = "mt-2 w-full border-b border-white/[0.09] bg-transparent py-2 text-[12px] text-white/70 outline-none focus:border-violet-400";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState([{ label: "Prazos processuais", note: "7, 3 e 1 dia antes", enabled: true }, { label: "Movimentações dos tribunais", note: "Imediatamente após captura", enabled: true }, { label: "Recebíveis vencidos", note: "No primeiro dia de atraso", enabled: false }]);
  function exportSettings() { const blob = new Blob([JSON.stringify({ office: "Ribeiro & Associados", notifications }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "configuracoes-otimizia.json"; link.click(); URL.revokeObjectURL(url); }
  return <LegalPage>
    <PageHeader eyebrow="Escritório / Configurações" title="Configurações" description="Preferências da organização, integrações e políticas do workspace jurídico." action={<PrimaryAction icon={Save} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }}>{saved ? "Alterações salvas" : "Salvar alterações"}</PrimaryAction>} />
    <section className="grid border-b border-white/[0.08] lg:grid-cols-[.58fr_1.42fr]">
      <div className="border-b border-white/[0.08] py-8 lg:border-b-0 lg:border-r lg:pr-9"><LegalSettingsMenu /></div>
      <div className="space-y-12 py-8 lg:pl-9">
        <section id="dados-escritorio" className="scroll-mt-20">
          <SectionTitle title="Dados do escritório" description="Informações exibidas em documentos e comunicações" />
          <div className="grid gap-6 sm:grid-cols-2"><label className="block"><span className="text-[10px] text-white/32">Nome de exibição</span><input defaultValue="Ribeiro & Associados" className={fieldClass} /></label><label className="block"><span className="text-[10px] text-white/32">CNPJ</span><input defaultValue="12.345.678/0001-90" className={fieldClass} /></label><label className="block"><span className="text-[10px] text-white/32">OAB principal</span><input defaultValue="OAB/SP 123.456" className={fieldClass} /></label><label className="block"><span className="text-[10px] text-white/32">Fuso horário</span><input defaultValue="America/Sao_Paulo" className={fieldClass} /></label></div>
        </section>

        <section id="notificacoes" className="scroll-mt-20 border-t border-white/[0.07] pt-8">
          <SectionTitle title="Notificações" description="Eventos que exigem atenção da equipe" />
          <div>{notifications.map((item, index) => <div key={item.label} className="flex items-center justify-between gap-5 border-t border-white/[0.055] py-4 first:border-t-0"><div><p className="text-[11px] font-medium text-white/58">{item.label}</p><p className="mt-1 text-[9px] text-white/27">{item.note}</p></div><button type="button" role="switch" aria-checked={item.enabled} aria-label={item.label} onClick={() => setNotifications((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, enabled: !entry.enabled } : entry))} className={`relative h-5 w-9 rounded-full ${item.enabled ? "bg-violet-500/75" : "bg-white/[0.08]"}`}><span className={`absolute left-0 top-1 size-3 rounded-full bg-white/80 transition-transform ${item.enabled ? "translate-x-5" : "translate-x-1"}`} /></button></div>)}</div>
        </section>

        <section id="integracoes" className="scroll-mt-20 border-t border-white/[0.07] pt-8">
          <SectionTitle title="Integrações essenciais" description="Serviços conectados à operação jurídica" />
          <div>{[{ name: "DataJud / CNJ", status: "Conectado", tone: "success" as const }, { name: "Autentique", status: "Conectado", tone: "success" as const }, { name: "WhatsApp", status: "Configurar", tone: "warning" as const }].map((item) => <div key={item.name} className="flex items-center justify-between border-t border-white/[0.055] py-4 first:border-t-0"><span className="text-[11px] text-white/48">{item.name}</span><StatusTag tone={item.tone}>{item.status}</StatusTag></div>)}</div>
        </section>

        <section id="seguranca" className="scroll-mt-20 border-t border-white/[0.07] pt-8"><SectionTitle title="Segurança e privacidade" description="Acesso protegido por organização, cargo e participação no processo" /><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] text-white/28">Sessões ativas</p><p className="mt-2 text-[14px] font-medium text-white/66">2 dispositivos</p></div><div><p className="text-[10px] text-white/28">Última revisão de acessos</p><p className="mt-2 text-[14px] font-medium text-white/66">15 jul 2026</p></div></div></section>

        <section id="dados-exportacao" className="scroll-mt-20 border-t border-white/[0.07] pt-8"><SectionTitle title="Dados e exportação" description="Retenção, portabilidade e histórico do workspace" /><div className="flex flex-wrap items-center gap-x-10 gap-y-4"><div><p className="text-[10px] text-white/28">Retenção padrão</p><p className="mt-2 text-[13px] text-white/62">5 anos após encerramento</p></div><button type="button" onClick={exportSettings} className="text-[11px] font-medium text-violet-300/70 hover:text-violet-200">Solicitar exportação</button></div></section>
      </div>
    </section>
  </LegalPage>;
}
