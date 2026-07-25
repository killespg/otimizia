"use client";

import Link from "next/link";
import { Check, FileText } from "lucide-react";
import { ExpandableCard } from "@/components/ui/expandable-card";

const checklist = ["Qualificação das partes conferida", "Preliminares revisadas", "Documentos probatórios vinculados", "Pedidos finais aguardando validação"];

export function FeaturedDocumentPreview() {
  return (
    <ExpandableCard
      title="Contestação · versão 3"
      description="Revisão prioritária · vence hoje às 17:00"
      src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=700&fit=crop&q=82"
    >
      <div className="grid gap-6 border-y border-white/[0.07] py-5 sm:grid-cols-3">
        <div><p className="text-[9px] uppercase tracking-[0.09em] text-white/24">Processo</p><p className="mt-2 text-white/65">Construtora Vale × Município</p></div>
        <div><p className="text-[9px] uppercase tracking-[0.09em] text-white/24">Responsável</p><p className="mt-2 text-white/65">Carlos Mendes</p></div>
        <div><p className="text-[9px] uppercase tracking-[0.09em] text-white/24">Atualizado</p><p className="mt-2 text-white/65">Hoje, 11:42</p></div>
      </div>
      <div className="mt-7"><h4 className="text-[12px] font-semibold text-white/68">Checklist de revisão</h4><div className="mt-4 grid gap-3 sm:grid-cols-2">{checklist.map((item, index) => <div key={item} className="flex items-start gap-2.5"><span className={`mt-0.5 grid size-4 shrink-0 place-items-center ${index < 3 ? "text-emerald-300/65" : "text-amber-300/65"}`}>{index < 3 ? <Check size={12} /> : <span className="size-1.5 rounded-full bg-current" />}</span><span className="text-[11px] text-white/43">{item}</span></div>)}</div></div>
      <div className="mt-8 flex items-center justify-between border-t border-white/[0.07] pt-5"><p className="text-[10px] text-white/28">Documento restrito à equipe do caso</p><Link href="/painel/juridico/processos" className="inline-flex items-center gap-2 text-[11px] font-medium text-violet-300/70 hover:text-violet-200"><FileText size={13} />Abrir processos</Link></div>
    </ExpandableCard>
  );
}
