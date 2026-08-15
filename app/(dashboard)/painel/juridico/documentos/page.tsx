import Link from "next/link";
import { ArrowUpRight, Download, FileCheck2, FilePenLine, FileText, Plus, Signature } from "lucide-react";
import { DocumentLink } from "@/components/legal/document-link";
import { canManageLegal, canViewLegal } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalCase, LegalDocument, LegalDocumentSignature } from "@/lib/supabase/types";

const TYPE_LABEL: Record<string, string> = { petition: "Petição", contract: "Contrato", evidence: "Prova", decision: "Decisão", power_of_attorney: "Procuração", client_document: "Documento do cliente", other: "Outro" };
const STATUS_LABEL: Record<string, string> = { draft: "Rascunho", review: "Em revisão", approved: "Aprovado", filed: "Protocolado", archived: "Arquivado" };

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [orgRole, { data: membership }, { data: rows }, { data: caseRows }, { data: signatureRows }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("legal_documents").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }),
    supabase.from("legal_cases").select("id,title").eq("org_id", orgId),
    supabase.from("legal_document_signatures").select("*").eq("org_id", orgId),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewLegal(membership?.job_role, isAdmin)) return <section className="panel p-6"><h1 className="text-xl font-semibold">Acesso jurídico restrito</h1></section>;

  const docs = (rows ?? []) as LegalDocument[];
  const cases = (caseRows ?? []) as Pick<LegalCase, "id" | "title">[];
  const signatures = (signatureRows ?? []) as LegalDocumentSignature[];
  const caseNames = new Map(cases.map((item) => [item.id, item.title]));
  const signatureByDocument = new Map(signatures.map((item) => [item.document_id, item]));
  const reviewCount = docs.filter((item) => item.status === "review").length;
  const awaitingSignature = signatures.filter((item) => item.status === "pending" || item.status === "viewed").length;
  const filedThisMonth = docs.filter((item) => item.status === "filed" && new Date(item.updated_at).getMonth() === new Date().getMonth()).length;

  return <div className="ui-page">
    <header className="flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold text-od-text-2">Jurídico / Documentos</p><h1 className="mt-2 text-od-title">Documentos</h1><p className="mt-2 text-sm leading-relaxed text-white/52">Arquivos, minutas, versões, revisão e assinatura vinculados aos casos reais.</p></div>{canManageLegal(membership?.job_role, isAdmin) ? <Link href="/painel/juridico/processos" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-od-accent px-4 text-[13px] font-semibold hover:bg-brand-600"><Plus size={15}/>Adicionar em um caso</Link> : null}</header>
    <section className="od-band grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Documentos ativos" value={String(docs.filter((item) => item.status !== "archived").length)}/><Metric label="Aguardando revisão" value={String(reviewCount)} danger/><Metric label="Para assinatura" value={String(awaitingSignature)}/><Metric label="Protocolados no mês" value={String(filedThisMonth)} success/></section>
    <section className="od-band grid lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,.55fr)]">
      <div className="py-7 lg:border-r lg:border-white/[0.08] lg:pr-8"><div className="mb-4"><h2 className="text-[15px] font-semibold">Arquivos recentes</h2><p className="mt-1 text-xs text-od-text-3">Documentos dos casos que sua função pode acessar</p></div>{docs.length ? <div><div className="hidden grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1fr)_90px_100px_26px] gap-3 border-b border-white/[0.07] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-od-text-3 md:grid"><span/><span>Documento</span><span>Caso</span><span>Status</span><span>Atualizado</span><span/></div>{docs.map((doc) => { const signature = signatureByDocument.get(doc.id); const content = <><FileText size={15} className="text-od-text-3"/><span className="min-w-0"><strong className="block truncate text-[12px] font-medium text-white/75">{doc.name}</strong><small className="mt-1 block text-xs text-od-text-3">{TYPE_LABEL[doc.document_type]} · v{doc.version}{doc.generated_by_ai ? " · minuta gerada" : ""}</small></span><span className="truncate text-xs text-od-text-3">{caseNames.get(doc.case_id) || "Caso removido"}</span><span className="w-fit rounded-md border border-white/[0.09] px-2 py-1 text-xs text-od-text-3">{signature ? `Assinatura: ${signature.status}` : STATUS_LABEL[doc.status]}</span><time className="text-xs text-od-text-3">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(doc.updated_at))}</time><Download size={12} className="text-od-text-3"/></>;
          const classes = "grid w-full grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-white/[0.06] px-2 py-4 text-left hover:bg-white/[0.025] md:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1fr)_90px_100px_26px] md:items-center";
          if (doc.storage_path) return <DocumentLink key={doc.id} documentId={doc.id} className={classes}>{content}</DocumentLink>;
          if (doc.external_url) return <a key={doc.id} href={doc.external_url} target="_blank" rel="noreferrer" className={classes}>{content}</a>;
          return <Link key={doc.id} href={`/painel/juridico/processos/${doc.case_id}`} className={classes}>{content}</Link>;
        })}</div> : <div className="border border-dashed border-white/[0.09] py-12 text-center"><FileText className="mx-auto text-od-text-3"/><p className="mt-3 text-sm font-semibold">Nenhum documento cadastrado</p><p className="mt-1 text-xs text-od-text-3">Abra um caso para enviar arquivo, adicionar link ou gerar minuta.</p></div>}</div>
      <aside className="py-7 lg:pl-8"><h2 className="text-[15px] font-semibold">Fluxo documental</h2><p className="mt-1 text-xs text-od-text-3">Situação atual do escritório</p><div className="mt-6 space-y-6"><Flow icon={FilePenLine} title={`${reviewCount} aguardando revisão`} text="Minutas e arquivos que ainda precisam de decisão jurídica." tone="text-amber-300"/><Flow icon={Signature} title={`${awaitingSignature} para assinatura`} text="Status acompanhado pela integração de assinatura eletrônica." tone="text-od-text-2"/><Flow icon={FileCheck2} title={`${docs.filter((item) => item.status === "approved").length} aprovados`} text="Documentos aprovados permanecem vinculados ao histórico do caso." tone="text-emerald-300"/></div><Link href="/painel/juridico/processos" className="mt-8 inline-flex items-center gap-1 text-xs font-semibold text-od-text-2">Abrir carteira de casos<ArrowUpRight size={13}/></Link></aside>
    </section>
  </div>;
}

function Metric({ label, value, danger, success }: { label: string; value: string; danger?: boolean; success?: boolean }) { return <div className="border-b border-white/[0.08] px-4 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><strong className={`text-[25px] font-bold tracking-[-.03em] ${danger ? "text-[#fb7767]" : success ? "text-emerald-300" : "text-white"}`}>{value}</strong><p className="mt-1 text-xs text-od-text-3">{label}</p></div>; }
function Flow({ icon: Icon, title, text, tone }: { icon: typeof FileText; title: string; text: string; tone: string }) { return <div className="flex gap-3"><Icon size={15} className={`mt-0.5 ${tone}`}/><div><p className="text-xs font-medium text-white/68">{title}</p><p className="mt-1 text-xs leading-5 text-od-text-3">{text}</p></div></div>; }
