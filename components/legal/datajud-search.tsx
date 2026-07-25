"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LoaderCircle, Search } from "lucide-react";
import type { DatajudProcess } from "@/lib/datajud";
import { DATAJUD_TRIBUNALS } from "@/lib/datajud-tribunals";

function processNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 20 ? `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}` : value;
}

export function DatajudSearch() {
  const router = useRouter();
  const [tribunalAlias, setTribunalAlias] = useState("tjsp");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [result, setResult] = useState<DatajudProcess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/law/datajud-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tribunalAlias, numeroProcesso }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível consultar o processo.");
      setResult(body.process);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível consultar o processo."); }
    finally { setLoading(false); }
  }

  async function createCase() {
    if (!result) return; setCreating(true); setError(null);
    try {
      const response = await fetch("/api/law/quick-case", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tribunalAlias, numeroProcesso: result.numeroProcesso, title: result.classe?.nome }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível abrir o processo.");
      router.push(`/painel/juridico/processos/${body.caseId}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível abrir o processo."); setCreating(false); }
  }

  return <div className="py-8">
    <form onSubmit={search} className="grid gap-5 border-b border-white/[0.08] pb-7 md:grid-cols-[280px_minmax(0,1fr)_auto] md:items-end">
      <label className="space-y-2"><span className="text-[11px] font-medium text-white/48">Tribunal</span><select value={tribunalAlias} onChange={(event) => setTribunalAlias(event.target.value)} className="h-11 w-full border-b border-white/[0.12] bg-[#100e12] px-1 text-[12px] text-white/65 outline-none focus:border-violet-400">{DATAJUD_TRIBUNALS.map((tribunal) => <option key={tribunal.alias} value={tribunal.alias}>{tribunal.label}</option>)}</select></label>
      <label className="space-y-2"><span className="text-[11px] font-medium text-white/48">Número CNJ do processo</span><input value={numeroProcesso} onChange={(event) => setNumeroProcesso(event.target.value)} required placeholder="0000832-35.2018.4.01.3202" className="h-11 w-full border-b border-white/[0.12] bg-transparent px-1 font-mono text-[12px] text-white/75 outline-none placeholder:text-white/18 focus:border-violet-400" /></label>
      <button type="submit" disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-[3px] bg-[#7146dc] px-4 text-[11px] font-semibold text-white disabled:opacity-40">{loading ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />}Consultar</button>
    </form>
    {error ? <p className="border-b border-red-400/15 py-4 text-[11px] text-[#ff8175]">{error}</p> : null}
    {result ? <section className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_1.2fr]">
      <div><p className="text-[10px] uppercase tracking-[0.12em] text-violet-300/55">{result.classe?.nome ?? "Classe não informada"}</p><h2 className="mt-3 font-mono text-[20px] font-semibold text-white/82">{processNumber(result.numeroProcesso)}</h2><dl className="mt-7 grid gap-6 sm:grid-cols-2"><div><dt className="text-[10px] text-white/26">Órgão julgador</dt><dd className="mt-2 text-[12px] text-white/62">{result.orgaoJulgador?.nome ?? "Não informado"}</dd></div><div><dt className="text-[10px] text-white/26">Ajuizamento</dt><dd className="mt-2 text-[12px] text-white/62">{result.dataAjuizamento ? new Date(result.dataAjuizamento).toLocaleDateString("pt-BR") : "Não informado"}</dd></div></dl><button type="button" onClick={createCase} disabled={creating} className="mt-8 inline-flex items-center gap-2 text-[11px] font-semibold text-violet-300/75 hover:text-violet-200 disabled:opacity-40">{creating ? "Abrindo processo…" : "Adicionar à carteira"}<ArrowUpRight size={13} /></button></div>
      <div className="border-l border-white/[0.08] pl-7"><div className="flex items-center justify-between"><h3 className="text-[13px] font-semibold text-white/72">Movimentações</h3><span className="text-[10px] text-white/25">{result.movimentos.length} registros</span></div><div className="mt-5 max-h-[430px] overflow-y-auto">{[...result.movimentos].sort((a,b) => new Date(b.dataHora).getTime()-new Date(a.dataHora).getTime()).map((movement, index) => <article key={`${movement.codigo}-${movement.dataHora}-${index}`} className="border-t border-white/[0.06] py-4"><p className="text-[11px] font-medium text-white/62">{movement.nome}</p><p className="mt-1.5 text-[9px] text-white/25">{new Date(movement.dataHora).toLocaleString("pt-BR")}</p></article>)}</div></div>
    </section> : <div className="py-16 text-center text-[11px] text-white/24">A consulta pesquisa dados públicos do DataJud/CNJ e passa a monitorar o processo pesquisado.</div>}
  </div>;
}
