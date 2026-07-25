"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";

const configs: Record<string, { title: string; description: string; fields: Array<{ name: string; label: string; type?: string; placeholder?: string }> }> = {
  processo: { title: "Novo processo", description: "Abra um caso na carteira jurídica.", fields: [{ name: "title", label: "Título do caso", placeholder: "Mariana Lopes × Grupo Atlas" }, { name: "case_number", label: "Número do processo", placeholder: "0000000-00.0000.0.00.0000" }, { name: "area", label: "Área do direito", placeholder: "Trabalhista" }, { name: "deadline", label: "Próximo prazo", type: "datetime-local" }] },
  cliente: { title: "Novo cliente", description: "Cadastre a pessoa e os dados essenciais de contato.", fields: [{ name: "name", label: "Nome ou razão social" }, { name: "email", label: "E-mail", type: "email" }, { name: "phone", label: "Telefone" }, { name: "document", label: "CPF ou CNPJ" }] },
  prazo: { title: "Novo prazo", description: "Registre o compromisso e vincule-o ao processo.", fields: [{ name: "title", label: "Título" }, { name: "case", label: "Processo ou cliente" }, { name: "due_at", label: "Data e hora", type: "datetime-local" }, { name: "owner", label: "Responsável" }] },
  documento: { title: "Novo documento", description: "Adicione um documento, versão ou link externo ao processo.", fields: [{ name: "name", label: "Nome do documento" }, { name: "case", label: "Processo ou cliente" }, { name: "url", label: "Link do arquivo", type: "url", placeholder: "https://" }, { name: "type", label: "Tipo", placeholder: "Petição, contrato, procuração…" }] },
  atividade: { title: "Registrar atividade", description: "Inclua uma movimentação manual no histórico do processo.", fields: [{ name: "title", label: "Título da atividade" }, { name: "type", label: "Tipo", placeholder: "Andamento, protocolo, audiência…" }, { name: "occurred_at", label: "Data e hora", type: "datetime-local" }, { name: "description", label: "Descrição" }] },
  lancamento: { title: "Novo lançamento", description: "Registre honorário, recebimento ou despesa jurídica.", fields: [{ name: "description", label: "Descrição" }, { name: "amount", label: "Valor", type: "number" }, { name: "date", label: "Data", type: "date" }, { name: "case", label: "Processo ou cliente" }] },
  membro: { title: "Convidar pessoa", description: "Envie um convite e defina o cargo jurídico inicial.", fields: [{ name: "name", label: "Nome" }, { name: "email", label: "E-mail", type: "email" }, { name: "role", label: "Cargo", placeholder: "Advogado, assistente, financeiro…" }] },
};

export function LegalRecordDrawer() {
  const pathname = usePathname(); const searchParams = useSearchParams(); const router = useRouter();
  const type = searchParams.get("novo") ?? ""; const config = configs[type]; const detail = searchParams.get("detalhe");
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(false), [type]);
  function close() { const params = new URLSearchParams(searchParams.toString()); params.delete("novo"); params.delete("detalhe"); params.delete("horario"); params.delete("tipo"); router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }); }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    const records = JSON.parse(localStorage.getItem("otimizia:legal-records") ?? "[]") as unknown[];
    localStorage.setItem("otimizia:legal-records", JSON.stringify([{ type, ...payload, createdAt: new Date().toISOString() }, ...records]));
    setSaved(true); setTimeout(close, 900);
  }
  if (!config && detail) return <div className="fixed inset-0 z-[80] flex justify-end bg-black/55 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={detail} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="h-full w-full max-w-[430px] border-l border-white/[0.09] bg-[#121015] px-7 py-7"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.14em] text-violet-300/50">Compromisso jurídico</p><h2 className="mt-3 text-[21px] font-semibold text-white/84">{detail}</h2></div><button type="button" onClick={close} aria-label="Fechar" className="grid size-9 place-items-center text-white/30 hover:text-white/70"><X size={17} /></button></div><dl className="mt-10 space-y-6 border-y border-white/[0.08] py-6"><div><dt className="text-[9px] uppercase tracking-[0.1em] text-white/22">Horário</dt><dd className="mt-2 text-[13px] text-white/65">{searchParams.get("horario")}</dd></div><div><dt className="text-[9px] uppercase tracking-[0.1em] text-white/22">Tipo</dt><dd className="mt-2 text-[13px] text-white/65">{searchParams.get("tipo")}</dd></div></dl><div className="mt-7 flex gap-3"><button type="button" onClick={close} className="h-9 px-3 text-[11px] text-white/38">Fechar</button><button type="button" onClick={() => router.push(`${pathname}?novo=prazo`)} className="h-9 rounded-[3px] bg-[#7146dc] px-4 text-[11px] font-semibold text-white">Editar compromisso</button></div></section></div>;
  if (!config) return null;
  return <div className="fixed inset-0 z-[80] flex justify-end bg-black/55 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={config.title} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className="h-full w-full max-w-[480px] overflow-y-auto border-l border-white/[0.09] bg-[#121015] px-7 py-7 shadow-2xl">
      <div className="flex items-start justify-between gap-5"><div><p className="text-[10px] uppercase tracking-[0.14em] text-violet-300/50">Cadastro jurídico</p><h2 className="mt-3 text-[22px] font-semibold text-white/86">{config.title}</h2><p className="mt-2 text-[11px] leading-relaxed text-white/34">{config.description}</p></div><button type="button" onClick={close} aria-label="Fechar" className="grid size-9 place-items-center text-white/30 hover:text-white/70"><X size={17} /></button></div>
      {saved ? <div className="mt-16 flex items-center gap-3 border-y border-emerald-400/15 py-6 text-[12px] text-emerald-300/80"><Check size={17} />Registro salvo neste ambiente.</div> : <form onSubmit={submit} className="mt-10 space-y-6">{config.fields.map((field) => <label key={field.name} className="block"><span className="text-[10px] font-medium text-white/42">{field.label}</span><input name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} required className="mt-2 h-11 w-full border-b border-white/[0.12] bg-transparent px-1 text-[12px] text-white/75 outline-none placeholder:text-white/17 focus:border-violet-400" /></label>)}<div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-7"><button type="button" onClick={close} className="h-9 px-3 text-[11px] text-white/38 hover:text-white/70">Cancelar</button><button type="submit" className="h-9 rounded-[3px] bg-[#7146dc] px-4 text-[11px] font-semibold text-white hover:bg-[#8055e8]">Salvar registro</button></div></form>}
    </section>
  </div>;
}
