import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/ui/PendingButton";
import { canManageLegal, canViewFinance, canViewLegal, LEGAL_CASE_STATUS } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalCase, LegalCaseEvent, LegalCaseMember, LegalCaseShareLink, LegalDeadline, LegalDocument, LegalDocumentSignature, Receivable } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/utils/format";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { DATAJUD_TRIBUNALS, sortTribunalsByFavorites } from "@/lib/law/datajud-tribunals";
import { IconArrowRight, IconBot, IconCheckCircle, IconClock, IconPaperclip, IconPlus, IconTrash, IconWallet } from "../../../icons";
import { addLegalCaseMember, completeLegalDeadline, createCaseShareLink, createLegalDeadline, createLegalDocumentLink, createLegalEvent, generateLegalDocumentDraft, linkDatajudProcess, removeLegalCaseMember, revokeCaseShareLink, syncDatajudProcessNow, toggleDeadlineVisibility, toggleDocumentVisibility, toggleEventVisibility, updateLegalCaseStatus, uploadLegalDocument } from "../../actions";
import { DocumentLink } from "@/components/legal/document-link";
import { DocumentDraftViewer } from "@/components/legal/document-draft-viewer";
import { SendForSignature } from "@/components/legal/send-for-signature";
import { DeadlineFormCalculator } from "@/components/legal/deadline-form-calculator";
import { CopyShareLink } from "@/components/ui/CopyShareLink";

const SIGNATURE_STATUS_LABEL: Record<LegalDocumentSignature["status"], string> = {
  pending: "Aguardando assinatura",
  viewed: "Visualizado pelo signatário",
  signed: "Assinado",
  rejected: "Assinatura recusada",
  delivery_failed: "Falha no envio",
};

const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const EVENT_LABEL: Record<string,string> = { update:"Andamento", filing:"Protocolo", decision:"Decisão", hearing:"Audiência", communication:"Comunicação", note:"Nota interna" };
const DOCUMENT_LABEL: Record<string,string> = { petition:"Petição", contract:"Contrato", evidence:"Prova", decision:"Decisão", power_of_attorney:"Procuração", client_document:"Documento do cliente", other:"Outro" };
const MEMBER_ROLE_LABEL: Record<string,string> = { lead:"Responsável", collaborator:"Colaborador(a)", viewer:"Visualizador(a)" };

export default async function LegalCasePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: profile }, orgId] = await Promise.all([supabase.from("profiles").select("profession_type,is_admin,favorite_tribunals").maybeSingle(), getActiveOrgId(supabase, user.id)]);
  if (getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin) !== "law_office") notFound();
  const [orgRole, { data: membership }, members] = await Promise.all([getOrgRole(supabase, orgId, user.id), supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(), getOrgMembers(supabase, orgId)]);
  const isAdmin = orgRole === "admin";const jobRole = membership?.job_role;
  if (!canViewLegal(jobRole, isAdmin)) notFound();
  const { data } = await supabase.from("legal_cases").select("*, contacts(name,phone,email)").eq("id", params.id).eq("org_id", orgId).maybeSingle();
  if (!data) notFound();
  const legalCase = data as LegalCase & { contacts: {name:string;phone:string|null;email:string|null} | null };
  const [{data: deadlineRows},{data:eventRows},{data:documentRows},{data:memberRows},{data:shareLinkRows},financeResult] = await Promise.all([
    supabase.from("legal_deadlines").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("due_at"),
    supabase.from("legal_case_events").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("occurred_at",{ascending:false}),
    supabase.from("legal_documents").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("created_at",{ascending:false}),
    supabase.from("legal_case_members").select("*").eq("case_id",legalCase.id),
    canManageLegal(jobRole,isAdmin) ? supabase.from("legal_case_share_links").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("created_at",{ascending:false}) : Promise.resolve({data:[]}),
    canViewFinance(jobRole,isAdmin) ? supabase.from("receivables").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("due_date") : Promise.resolve({data:[]}),
  ]);
  const deadlines=(deadlineRows??[]) as LegalDeadline[], events=(eventRows??[]) as LegalCaseEvent[], documents=(documentRows??[]) as LegalDocument[], caseMembers=(memberRows??[]) as LegalCaseMember[], shareLinks=(shareLinkRows??[]) as LegalCaseShareLink[], receivables=(financeResult.data??[]) as Receivable[];
  const pending=deadlines.filter(item=>item.status==="pending"), open=receivables.filter(item=>!["paid","cancelled"].includes(item.status)).reduce((sum,item)=>sum+item.original_cents-item.paid_cents,0);
  const canManage=canManageLegal(jobRole,isAdmin);const memberNames=new Map(members.map(m=>[m.user_id,m.name??"Sem nome"]));
  const signableDocumentIds = documents.filter((d) => d.storage_path?.toLowerCase().endsWith(".pdf")).map((d) => d.id);
  const { data: signatureRows } = canManage && signableDocumentIds.length > 0
    ? await supabase.from("legal_document_signatures").select("*").eq("org_id", orgId).in("document_id", signableDocumentIds).order("created_at", { ascending: false })
    : { data: [] as LegalDocumentSignature[] };
  const signatureByDocument = new Map<string, LegalDocumentSignature>();
  for (const signature of (signatureRows ?? []) as LegalDocumentSignature[]) {
    if (!signatureByDocument.has(signature.document_id)) signatureByDocument.set(signature.document_id, signature);
  }
  return <div className="mx-auto w-full max-w-[1640px] space-y-5">
    <Link href="/painel/juridico/processos" className="inline-flex items-center gap-2 text-xs font-semibold text-od-text-2 hover:text-od-text"><IconArrowRight className="h-3.5 w-3.5 rotate-180"/>Voltar para processos</Link>
    <header className="border-b border-white/[0.08] pb-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-semibold text-od-text-2">{legalCase.area??"Caso jurídico"}</p><h1 className="mt-2 text-od-title text-white">{legalCase.title}</h1><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs font-semibold text-od-text">{LEGAL_CASE_STATUS[legalCase.status]}</span>{legalCase.case_number&&<span className="rounded-md border border-white/[0.09] px-2 py-1 font-mono text-xs text-white/52">{legalCase.case_number}</span>}{legalCase.court&&<span className="rounded-md border border-white/[0.09] px-2 py-1 text-xs text-white/52">{legalCase.court}</span>}</div></div>{canManage&&<form action={updateLegalCaseStatus} className="flex min-w-56 gap-2"><input type="hidden" name="id" value={legalCase.id}/><label className="sr-only" htmlFor="case-status">Situação</label><select id="case-status" name="status" defaultValue={legalCase.status} className="field">{Object.entries(LEGAL_CASE_STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><PendingButton className="btn" pendingLabel="Salvando">Salvar</PendingButton></form>}</div></header>
    <section className="grid border-t border-white/[0.08] sm:grid-cols-2 xl:grid-cols-4"><Metric label="Prazos pendentes" value={String(pending.length)} icon={IconClock}/><Metric label="Movimentações" value={String(events.length)} icon={IconArrowRight}/><Metric label="Documentos" value={String(documents.length)} icon={IconPaperclip}/>{canViewFinance(jobRole,isAdmin)&&<Metric label="Honorários em aberto" value={formatBRL(open)} icon={IconWallet}/>}</section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]"><div className="space-y-5">
      <section className="panel p-5"><h2 className="text-lg font-black text-ink">Visão geral</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="Cliente" value={legalCase.contacts?.name??"Não informado"}/><Info label="Parte contrária" value={legalCase.opposing_party??"Não informada"}/><Info label="Comarca" value={legalCase.jurisdiction??"Não informada"}/><Info label="Responsável" value={legalCase.responsible_id?memberNames.get(legalCase.responsible_id)??"Sem nome":"Não definido"}/></dl><div className="mt-5 border-t border-line pt-5"><p className="label">Estratégia e resumo</p><p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink-soft">{legalCase.summary??"Ainda não há resumo registrado."}</p></div></section>
      <section className="panel p-5">
        <h2 className="text-lg font-black text-ink">Monitoramento processual (DataJud)</h2>
        {legalCase.datajud_tribunal_alias ? (
          <>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Info label="Tribunal" value={DATAJUD_TRIBUNALS.find((t) => t.alias === legalCase.datajud_tribunal_alias)?.label ?? legalCase.datajud_tribunal_alias} />
              <Info label="Última sincronização" value={legalCase.datajud_last_synced_at ? dateTime(legalCase.datajud_last_synced_at) : "Ainda não sincronizado"} />
            </dl>
            {canManage && (
              <form action={syncDatajudProcessNow} className="mt-4">
                <input type="hidden" name="case_id" value={legalCase.id} />
                <PendingButton className="btn-soft" pendingLabel="Sincronizando">Sincronizar agora</PendingButton>
              </form>
            )}
            <p className="mt-4 text-xs font-medium leading-relaxed text-ink-muted">
              Movimentações novas entram na linha do tempo abaixo automaticamente (1x/dia, ou quando você sincronizar manualmente). Quando uma movimentação parece exigir atenção, um lembrete de revisão é criado em &ldquo;Prazos e audiências&rdquo; — é um alerta pra revisar, não o cálculo oficial do prazo. Sempre confirme o prazo real no processo.
            </p>
          </>
        ) : canManage ? (
          <form action={linkDatajudProcess} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="case_id" value={legalCase.id} />
            <Select
              name="datajud_tribunal_alias"
              label="Tribunal"
              options={sortTribunalsByFavorites(profile?.favorite_tribunals ?? []).map((t) => [
                t.alias,
                (profile?.favorite_tribunals ?? []).includes(t.alias) ? `★ ${t.label}` : t.label,
              ])}
            />
            <Field name="case_number" label="Número do processo (CNJ)" placeholder="0000832-35.2018.4.01.3202" required />
            <div className="sm:col-span-2">
              <PendingButton className="btn" pendingLabel="Vinculando"><IconPlus className="h-4 w-4" />Vincular processo</PendingButton>
            </div>
          </form>
        ) : (
          <p className="mt-3 text-sm font-medium text-ink-muted">Nenhum processo vinculado ainda.</p>
        )}
      </section>
      <section className="panel overflow-hidden"><SectionTitle title="Linha do tempo" count={events.length}/>{canManage&&<form action={createLegalEvent} className="grid gap-3 border-b border-line bg-surface-2 p-4 md:grid-cols-3"><input type="hidden" name="case_id" value={legalCase.id}/><Field name="title" label="Movimentação" placeholder="Ex.: Contestação protocolada" required/><Select name="event_type" label="Tipo" options={Object.entries(EVENT_LABEL)}/><Field name="occurred_at" label="Data" type="datetime-local"/><div className="md:col-span-3"><label className="label" htmlFor="event-description">Detalhes</label><textarea id="event-description" name="description" className="field mt-1.5 min-h-20"/><PendingButton className="btn mt-3" pendingLabel="Registrando"><IconPlus className="h-4 w-4"/>Registrar</PendingButton></div></form>}{events.length===0?<Empty text="Nenhuma movimentação registrada."/>:<div className="divide-y divide-line">{events.map(e=><article key={e.id} className="px-5 py-4"><div className="flex items-center justify-between gap-3"><span className="tag bg-brand-50 text-brand-700">{EVENT_LABEL[e.event_type]}</span><time className="text-xs font-bold text-ink-muted">{dateTime(e.occurred_at)}</time></div><h3 className="mt-2 text-sm font-black text-ink">{e.title}</h3>{e.description&&<p className="mt-1 whitespace-pre-wrap text-sm font-medium text-ink-soft">{e.description}</p>}{canManage&&<div className="mt-2"><VisibilityToggle action={toggleEventVisibility} id={e.id} caseId={legalCase.id} visible={e.client_visible}/></div>}</article>)}</div>}</section>
      <section className="panel overflow-hidden"><SectionTitle title="Documentos do caso" count={documents.length}/>{canManage&&<div className="grid gap-4 border-b border-line bg-surface-2 p-4 md:grid-cols-3"><form action={createLegalDocumentLink} className="space-y-3"><input type="hidden" name="case_id" value={legalCase.id}/><p className="label">Link externo</p><Field name="name" label="Nome do documento" required/><Field name="external_url" label="Link seguro" type="url" placeholder="https://..." required/><Select name="document_type" label="Tipo" options={Object.entries(DOCUMENT_LABEL)}/><PendingButton className="btn min-h-11 w-full" pendingLabel="Adicionando"><IconPaperclip className="h-4 w-4"/>Adicionar link</PendingButton></form><form action={uploadLegalDocument} encType="multipart/form-data" className="space-y-3"><input type="hidden" name="case_id" value={legalCase.id}/><p className="label">Enviar arquivo</p><Field name="name" label="Nome do documento" required/><div><label className="label" htmlFor="document-file">Arquivo (PDF, Word ou imagem — até 20MB)</label><input id="document-file" name="file" type="file" required accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" className="field mt-1.5"/></div><Select name="document_type" label="Tipo" options={Object.entries(DOCUMENT_LABEL)}/><PendingButton className="btn min-h-11 w-full" pendingLabel="Enviando"><IconPaperclip className="h-4 w-4"/>Enviar arquivo</PendingButton></form><form action={generateLegalDocumentDraft} className="space-y-3"><input type="hidden" name="case_id" value={legalCase.id}/><p className="label">Minuta com IA</p><Field name="piece_type" label="Tipo de peça" required placeholder="Ex.: Contestação, Réplica..."/><Field name="name" label="Nome do documento (opcional)"/><div><label className="label" htmlFor="draft-instructions">Instruções e pedido</label><textarea id="draft-instructions" name="instructions" maxLength={1600} className="field mt-1.5 min-h-[4.75rem]" placeholder="Teses, pontos e pedidos que a minuta deve cobrir..."/></div><PendingButton className="btn min-h-11 w-full" pendingLabel="Gerando minuta"><IconBot className="h-4 w-4"/>Gerar minuta</PendingButton><p className="text-xs font-medium leading-relaxed text-ink-muted">Rascunho a partir dos dados do caso — sempre revise antes de usar.</p></form></div>}{documents.length===0?<Empty text="Nenhum documento vinculado."/>:<div className="divide-y divide-line">{documents.map(d=><div key={d.id} className="nav-item flex items-center gap-3 hover:bg-brand-50">{d.storage_path?<DocumentLink documentId={d.id} className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4 text-left"><div className="min-w-0"><p className="truncate text-sm font-black text-ink">{d.name}</p><p className="mt-1 text-xs font-bold text-ink-muted">{DOCUMENT_LABEL[d.document_type]} · versão {d.version}</p></div><IconArrowRight className="h-4 w-4 shrink-0 text-brand-700"/></DocumentLink>:d.external_url?<a href={d.external_url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-black text-ink">{d.name}</p><p className="mt-1 text-xs font-bold text-ink-muted">{DOCUMENT_LABEL[d.document_type]} · versão {d.version}</p></div><IconArrowRight className="h-4 w-4 shrink-0 text-brand-700"/></a>:<DocumentDraftViewer name={d.name} typeLabel={DOCUMENT_LABEL[d.document_type]} content={d.content??""}/>}{canManage&&(d.external_url||d.content)&&<div className="shrink-0 pr-5"><VisibilityToggle action={toggleDocumentVisibility} id={d.id} caseId={legalCase.id} visible={d.client_visible}/></div>}{canManage&&d.storage_path?.toLowerCase().endsWith(".pdf")&&<div className="shrink-0 pr-5">{signatureByDocument.get(d.id)?<SignatureStatus signature={signatureByDocument.get(d.id)!}/>:<SendForSignature documentId={d.id} defaultName={legalCase.contacts?.name??""} defaultEmail={legalCase.contacts?.email??""}/>}</div>}</div>)}</div>}</section>
    </div><aside className="space-y-5">
      <section className="panel overflow-hidden"><SectionTitle title="Prazos e audiências" count={pending.length}/>{canManage&&<form action={createLegalDeadline} className="space-y-3 border-b border-line bg-surface-2 p-4"><input type="hidden" name="case_id" value={legalCase.id}/><Field name="title" label="Prazo" required placeholder="Ex.: Apresentar réplica"/><DeadlineFormCalculator/><Select name="assigned_to" label="Responsável" options={members.map(m=>[m.user_id,m.name??"Sem nome"])}/><div className="grid grid-cols-2 gap-3"><Select name="deadline_type" label="Tipo" options={[["procedural","Processual"],["hearing","Audiência"],["internal","Interno"],["client","Cliente"],["administrative","Administrativo"]]}/><Select name="priority" label="Prioridade" options={[["normal","Normal"],["high","Alta"],["critical","Crítica"],["low","Baixa"]]}/></div><PendingButton className="btn w-full" pendingLabel="Criando"><IconPlus className="h-4 w-4"/>Criar prazo</PendingButton></form>}{deadlines.length===0?<Empty text="Nenhum prazo cadastrado."/>:<div className="divide-y divide-line">{deadlines.map(d=><article key={d.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className={"text-sm font-black "+(d.status==="pending"&&new Date(d.due_at)<new Date()?"text-danger-600":"text-ink")}>{d.title}</p><p className="mt-1 text-xs font-bold text-ink-muted">{dateTime(d.due_at)} · {d.assigned_to?memberNames.get(d.assigned_to):"Sem responsável"}</p></div>{d.status==="completed"?<IconCheckCircle className="h-5 w-5 text-brand-700"/>:canManage&&<form action={completeLegalDeadline}><input type="hidden" name="id" value={d.id}/><input type="hidden" name="case_id" value={legalCase.id}/><PendingButton aria-label="Concluir prazo" className="nav-item grid h-11 w-11 place-items-center rounded-lg border border-line hover:bg-brand-50" iconOnly pendingLabel="Concluindo"><IconCheckCircle className="h-5 w-5"/></PendingButton></form>}</div>{canManage&&<div className="mt-2"><VisibilityToggle action={toggleDeadlineVisibility} id={d.id} caseId={legalCase.id} visible={d.client_visible}/></div>}</article>)}</div>}</section>
      <section className="panel overflow-hidden"><SectionTitle title="Equipe do caso" count={caseMembers.length}/>{canManage&&<form action={addLegalCaseMember} className="grid gap-3 border-b border-line bg-surface-2 p-4"><input type="hidden" name="case_id" value={legalCase.id}/><Select name="user_id" label="Integrante" options={members.filter(m=>!caseMembers.some(cm=>cm.user_id===m.user_id)).map(m=>[m.user_id,m.name??"Sem nome"])}/><Select name="role" label="Papel" options={[["collaborator","Colaborador(a)"],["viewer","Visualizador(a)"],["lead","Responsável"]]}/><PendingButton className="btn w-full" pendingLabel="Adicionando"><IconPlus className="h-4 w-4"/>Adicionar à equipe</PendingButton></form>}{caseMembers.length===0?<Empty text="Nenhum integrante adicional."/>:<div className="divide-y divide-line">{caseMembers.map(m=><div key={m.user_id} className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-black text-ink">{memberNames.get(m.user_id)??"Sem nome"}</p><span className="tag mt-1 inline-block bg-surface-2 text-ink-muted">{MEMBER_ROLE_LABEL[m.role]}</span></div>{canManage&&<form action={removeLegalCaseMember}><input type="hidden" name="case_id" value={legalCase.id}/><input type="hidden" name="user_id" value={m.user_id}/><PendingButton aria-label="Remover integrante" className="nav-item grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-danger-50" iconOnly pendingLabel="Removendo"><IconTrash className="h-4 w-4 text-danger-600"/></PendingButton></form>}</div>)}</div>}</section>
      {canManage&&<section className="panel overflow-hidden"><SectionTitle title="Compartilhamento com cliente" count={shareLinks.filter(l=>!l.revoked_at).length}/><form action={createCaseShareLink} className="grid gap-3 border-b border-line bg-surface-2 p-4 sm:grid-cols-[1fr_auto]"><input type="hidden" name="case_id" value={legalCase.id}/><Field name="label" label="Identificação (opcional)" placeholder="Ex.: Link para o cliente"/><div className="flex items-end"><PendingButton className="btn min-h-11" pendingLabel="Criando"><IconPlus className="h-4 w-4"/>Gerar link</PendingButton></div></form>{shareLinks.length===0?<Empty text="Nenhum link gerado ainda."/>:<div className="divide-y divide-line">{shareLinks.map(link=>{const revoked=Boolean(link.revoked_at);return <div key={link.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-black text-ink">{link.label??"Link sem nome"}</p><p className="mt-1 text-xs font-bold text-ink-muted">{revoked?"Revogado":`${link.view_count} acesso(s)`}</p></div><div className="flex shrink-0 gap-2">{!revoked&&<CopyShareLink token={link.token}/>}{!revoked&&<form action={revokeCaseShareLink}><input type="hidden" name="id" value={link.id}/><input type="hidden" name="case_id" value={legalCase.id}/><PendingButton className="nav-item rounded-md border border-line bg-od-surface px-3 py-2 text-xs font-black text-danger-600 hover:border-danger-300 hover:bg-danger-50" pendingLabel="Revogando">Revogar</PendingButton></form>}</div></div>})}</div>}<p className="border-t border-line p-4 text-xs font-medium leading-relaxed text-ink-muted">Só o que estiver marcado como &ldquo;visível ao cliente&rdquo; em prazos, movimentações e documentos aparece nesse link — nada financeiro é exibido.</p></section>}
      {canViewFinance(jobRole,isAdmin)&&<Link href="/painel/financeiro" className="nav-item panel flex items-center justify-between p-5 hover:border-brand-300 hover:bg-brand-50"><div><p className="text-sm font-black text-ink">Financeiro do caso</p><p className="mt-1 text-xs font-bold text-ink-muted">{formatBRL(open)} em aberto</p></div><IconWallet className="h-5 w-5 text-brand-700"/></Link>}
    </aside></div>
  </div>;
}
function Metric({label,value,icon:Icon}:{label:string;value:string;icon:(p:{className?:string})=>React.ReactElement}){return <article className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><Icon className="h-4 w-4 text-od-text-2"/><div><p className="text-xs text-od-text-3">{label}</p><p className="mt-1 text-od-subtitle font-bold tracking-[-.02em] text-white">{value}</p></div></article>}
function Info({label,value}:{label:string;value:string}){return <div><dt className="label">{label}</dt><dd className="mt-1 text-sm font-medium text-white/68">{value}</dd></div>}
function SectionTitle({title,count}:{title:string;count:number}){return <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><h2 className="text-base font-semibold text-white">{title}</h2><span className="text-xs text-od-text-3">{count}</span></div>}
function Empty({text}:{text:string}){return <p className="p-5 text-sm text-white/52">{text}</p>}
function Field({name,label,type="text",placeholder,required=false}:{name:string;label:string;type?:string;placeholder?:string;required?:boolean}){return <div><label className="label" htmlFor={name}>{label}{required&&<span className="text-danger-600"> *</span>}</label><input id={name} name={name} type={type} placeholder={placeholder} required={required} className="field mt-1.5"/></div>}
function Select({name,label,options}:{name:string;label:string;options:string[][]}){return <div><label className="label" htmlFor={name}>{label}</label><select id={name} name={name} className="field mt-1.5">{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></div>}
function VisibilityToggle({action,id,caseId,visible}:{action:(formData:FormData)=>Promise<void>;id:string;caseId:string;visible:boolean}){return <form action={action}><input type="hidden" name="id" value={id}/><input type="hidden" name="case_id" value={caseId}/><input type="hidden" name="client_visible" value={String(visible)}/><button type="submit" className={"text-xs font-black "+(visible?"text-brand-700":"text-ink-muted")}>{visible?"Visível ao cliente":"Marcar visível ao cliente"}</button></form>}
function SignatureStatus({signature}:{signature:LegalDocumentSignature}){
  const tone = signature.status==="signed" ? "bg-brand-50 text-brand-700" : signature.status==="rejected"||signature.status==="delivery_failed" ? "bg-danger-50 text-danger-600" : "bg-surface-2 text-ink-muted";
  return <div className="flex flex-col items-end gap-1">
    <span className={"tag "+tone}>{SIGNATURE_STATUS_LABEL[signature.status]}</span>
    {signature.status==="signed"&&signature.signed_file_url&&<a href={signature.signed_file_url} target="_blank" rel="noreferrer" className="text-xs font-black text-brand-700">Ver assinado</a>}
  </div>;
}
