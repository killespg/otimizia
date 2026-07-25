"use client";

import { useState } from "react";
import { ArrowUp, Bot, FileSearch, LoaderCircle, Scale, Sparkles } from "lucide-react";
import { LegalPage, PageHeader, SectionTitle } from "@/components/legal/legal-ui";

const suggestions = ["Resuma as movimentações de hoje", "Quais prazos vencem nos próximos 7 dias?", "Prepare um rascunho de manifestação", "Mostre clientes com recebíveis vencidos"];
type ChatMessage = { role: "user" | "assistant"; text: string };

export default function AssistantPage() {
  const [message, setMessage] = useState(""); const [messages, setMessages] = useState<ChatMessage[]>([]); const [loading, setLoading] = useState(false);
  async function send(event: React.FormEvent) {
    event.preventDefault(); const text = message.trim(); if (!text || loading) return;
    const next = [...messages, { role: "user" as const, text }]; setMessages(next); setMessage(""); setLoading(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.map((item) => ({ role: item.role, content: item.text })) }) });
      if (!response.ok || !response.body) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? "Não foi possível consultar o assistente."); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let assistantText = "";
      setMessages([...next, { role: "assistant", text: "" }]);
      while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) { if (!line.trim()) continue; const eventData = JSON.parse(line); if (eventData.type === "text") assistantText += eventData.text; if (eventData.type === "error") assistantText += eventData.message; setMessages([...next, { role: "assistant", text: assistantText }]); } }
    } catch (reason) { setMessages([...next, { role: "assistant", text: reason instanceof Error ? reason.message : "Não foi possível consultar o assistente." }]); }
    finally { setLoading(false); }
  }
  return <LegalPage><PageHeader eyebrow="Escritório / Sócio-assistente" title="Sócio-assistente" description="Consulta o contexto autorizado do escritório para apoiar análise e execução. Nenhuma ação externa é realizada sem confirmação." />
    <section className="grid min-h-[620px] border-b border-white/[0.08] lg:grid-cols-[.65fr_1.35fr]"><aside className="border-b border-white/[0.08] py-8 lg:border-b-0 lg:border-r lg:pr-9"><SectionTitle title="Contexto disponível" description="Fontes que podem participar desta conversa" /><div className="space-y-5">{[{ icon: Scale, title: "48 processos", note: "Respeitando confidencialidade e atribuição" }, { icon: FileSearch, title: "284 documentos", note: "Somente arquivos autorizados para seu cargo" }, { icon: Sparkles, title: "Agenda e financeiro", note: "Prazos, recebíveis e despesas do escritório" }].map(({ icon: Icon, title, note }) => <div key={title} className="flex gap-3"><Icon size={15} className="mt-0.5 text-od-text-3/55" /><div><p className="text-[11px] font-medium text-white/58">{title}</p><p className="mt-1 text-[10px] leading-relaxed text-white/28">{note}</p></div></div>)}</div><div className="mt-8 border-t border-white/[0.07] pt-6"><p className="text-[10px] leading-relaxed text-white/28">O assistente não substitui revisão jurídica. Citações, prazos e documentos gerados devem ser conferidos antes do uso.</p></div></aside>
      <div className="flex min-h-[620px] flex-col py-8 lg:pl-9"><div className="flex flex-1 flex-col overflow-y-auto px-4">{messages.length === 0 ? <div className="m-auto text-center"><span className="mx-auto grid size-11 place-items-center text-od-text-3/75"><Bot size={24} /></span><h2 className="mt-4 text-[17px] font-semibold text-white/76">Como posso ajudar no escritório?</h2><p className="mt-2 max-w-md text-[11px] leading-relaxed text-white/30">Posso analisar casos, localizar informações, organizar prazos e preparar rascunhos.</p><div className="mt-7 grid w-full max-w-2xl gap-2 sm:grid-cols-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setMessage(suggestion)} className="border-l border-white/[0.09] px-3 py-2 text-left text-[10px] text-white/38 hover:border-od-accent hover:text-white/65">{suggestion}</button>)}</div></div> : <div className="space-y-6 py-4">{messages.map((item, index) => <div key={index} className={item.role === "user" ? "ml-auto max-w-[78%] border-r border-od-accent/40 pr-4 text-right" : "max-w-[88%] border-l border-white/[0.09] pl-4"}><p className="whitespace-pre-wrap text-[12px] leading-6 text-white/65">{item.text || (loading && index === messages.length - 1 ? "Analisando…" : "")}</p></div>)}</div>}</div>
        <form className="mx-auto mt-6 flex w-full max-w-3xl items-end gap-3 border-t border-white/[0.08] pt-5" onSubmit={send}><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="Pergunte sobre um processo, prazo ou documento…" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-[12px] text-white/75 outline-none placeholder:text-white/22" /><button type="submit" aria-label="Enviar mensagem" className="grid size-9 shrink-0 place-items-center rounded-[3px] bg-[#7146dc] text-white disabled:opacity-30" disabled={!message.trim() || loading}>{loading ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowUp size={14} />}</button></form>
      </div>
    </section>
  </LegalPage>;
}
