import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { canManageLegal, canViewFinance, canViewLegal, LEGAL_CASE_STATUS } from "@/lib/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalCase, LegalCaseEvent, LegalDeadline, LegalDocument, Receivable } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/format";
import { getWorkspaceKey } from "@/lib/workspaces";
import { DATAJUD_TRIBUNALS } from "@/lib/datajud-tribunals";
import { IconAlert, IconArrowRight, IconCheckCircle, IconClock, IconPaperclip, IconPlus, IconWallet } from "../../icons";
import { completeLegalDeadline, createLegalDeadline, createLegalDocumentLink, createLegalEvent, linkDatajudProcess, syncDatajudProcessNow, updateLegalCaseStatus } from "../actions";

const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const EVENT_LABEL: Record<string,string> = { update:"Andamento", filing:"Protocolo", decision:"Decisão", hearing:"Audiência", communication:"Comunicação", note:"Nota interna" };
const DOCUMENT_LABEL: Record<string,string> = { petition:"Petição", contract:"Contrato", evidence:"Prova", decision:"Decisão", power_of_attorney:"Procuração", client_document:"Documento do cliente", other:"Outro" };

export default async function LegalCasePage({ params }: { params: { id: string } }) {
  const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: profile }, orgId] = await Promise.all([supabase.from("profiles").select("profession_type,is_admin").maybeSingle(), getActiveOrgId(supabase, user.id)]);
  if (getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin) !== "law_office") notFound();
  const [orgRole, { data: membership }, members] = await Promise.all([getOrgRole(supabase, orgId, user.id), supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(), getOrgMembers(supabase, orgId)]);
  const isAdmin = orgRole === "admin"; const jobRole = membership?.job_role;
  if (!canViewLegal(jobRole, isAdmin)) notFound();
  const { data } = await supabase.from("legal_cases").select("*, contacts(name,phone,email)").eq("id", params.id).eq("org_id", orgId).maybeSingle();
  if (!data) notFound();
  const legalCase = data as LegalCase & { contacts: {name:string;phone:string|null;email:string|null} | null };
  const [{data: deadlineRows},{data:eventRows},{data:documentRows},financeResult] = await Promise.all([
    supabase.from("legal_deadlines").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("due_at"),
    supabase.from("legal_case_events").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("occurred_at",{ascending:false}),
    supabase.from("legal_documents").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("created_at",{ascending:false}),
    canViewFinance(jobRole,isAdmin) ? supabase.from("receivables").select("*").eq("case_id",legalCase.id).eq("org_id",orgId).order("due_date") : Promise.resolve({data:[]}),
  ]);
  const deadlines=(deadlineRows??[]) as LegalDeadline[], events=(eventRows??[]) as LegalCaseEvent[], documents=(documentRows??[]) as LegalDocument[], receivables=(financeResult.data??[]) as Receivable[];
  const pending=deadlines.filter(item=>item.status==="pending"), open=receivables.filter(item=>!["paid","cancelled"].includes(item.status)).reduce((sum,item)=>sum+item.original_cents-item.paid_cents,0);
  const canManage=canManageLegal(jobRole,isAdmin); const memberNames=new Map(members.map(m=>[m.user_id,m.name??"Sem nome"]));
  return <div className="space-y-5">
    <Link href="/law" className="nav-item inline-flex min-h-11 items-center gap-2 text-sm font-black text-ink-muted hover:text-brand-700"><IconArrowRight className="h-4 w-4 rotate-180"/>Voltar para casos</Link>
    <header className="panel p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-sm font-black text-brand-700">{legalCase.area??"Caso jurídico"}</p><h1 className="mt-2 text-[clamp(1.8rem,5vw,3rem)] font-black tracking-[-.04em] text-ink">{legalCase.title}</h1><div className="mt-4 flex flex-wrap gap-2"><span className="tag bg-brand-50 text-brand-700">{LEGAL_CASE_STATUS[legalCase.status]}</span>{legalCase.case_number&&<span className="tag bg-surface-2 text-ink-muted">{legalCase.case_number}</span>}{legalCase.court&&<span className="tag bg-surface-2 text-ink-muted">{legalCase.court}</span>}</div></div>{canManage&&<form action={updateLegalCaseStatus} className="flex min-w-56 gap-2"><input type="hidden" name="id" value={legalCase.id}/><label className="sr-only" htmlFor="case-status">Situação</label><select id="case-status" name="status" defaultValue={legalCase.status} className="field">{Object.entries(LEGAL_CASE_STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><PendingButton className="btn" pendingLabel="Salvando">Salvar</PendingButton></form>}</div></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Prazos pendentes" value={String(pending.length)} icon={IconClock}/><Metric label="Movimentações" value={String(events.length)} icon={IconArrowRight}/><Metric label="Documentos" value={String(documents.length)} icon={IconPaperclip}/>{canViewFinance(jobRole,isAdmin)&&<Metric label="Honorários em aberto" value={formatBRL(open)} icon={IconWallet}/>}</section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]"><main className="space-y-5">
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
              Movimentações novas entram na linha do tempo abaixo automaticamente (1x/dia, ou quando você sincronizar manualmente). Quando uma movimentação parece exigir atenção, um lembrete de revisão é criado em "Prazos e audiências" — é um alerta pra revisar, não o cálculo oficial do prazo. Sempre confirme o prazo real no processo.
            </p>
          </>
        ) : canManage ? (
          <form action={linkDatajudProcess} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="case_id" value={legalCase.id} />
            <Select name="datajud_tribunal_alias" label="Tribunal" options={DATAJUD_TRIBUNALS.map((t) => [t.alias, t.label])} />
            <Field name="case_number" label="Número do processo (CNJ)" placeholder="0000832-35.2018.4.01.3202" required />
            <div className="sm:col-span-2">
              <PendingButton className="btn" pendingLabel="Vinculando"><IconPlus className="h-4 w-4" />Vincular processo</PendingButton>
            </div>
          </form>
        ) : (
          <p className="mt-3 text-sm font-medium text-ink-muted">Nenhum processo vinculado ainda.</p>
        )}
      </section>
      <section className="panel overflow-hidden"><SectionTitle title="Linha do tempo" count={events.length}/>{canManage&&<form action={createLegalEvent} className="grid gap-3 border-b border-line bg-surface-2 p-4 md:grid-cols-3"><input type="hidden" name="case_id" value={legalCase.id}/><Field name="title" label="Movimentação" placeholder="Ex.: Contestação protocolada" required/><Select name="event_type" label="Tipo" options={Object.entries(EVENT_LABEL)}/><Field name="occurred_at" label="Data" type="datetime-local"/><div className="md:col-span-3"><label className="label" htmlFor="event-description">Detalhes</label><textarea id="event-description" name="description" className="field mt-1.5 min-h-20"/><PendingButton className="btn mt-3" pendingLabel="Registrando"><IconPlus className="h-4 w-4"/>Registrar</PendingButton></div></form>}{events.length===0?<Empty text="Nenhuma movimentação registrada."/>:<div className="divide-y divide-line">{events.map(e=><article key={e.id} className="px-5 py-4"><div className="flex items-center justify-between gap-3"><span className="tag bg-brand-50 text-brand-700">{EVENT_LABEL[e.event_type]}</span><time className="text-xs font-bold text-ink-muted">{dateTime(e.occurred_at)}</time></div><h3 className="mt-2 text-sm font-black text-ink">{e.title}</h3>{e.description&&<p className="mt-1 whitespace-pre-wrap text-sm font-medium text-ink-soft">{e.description}</p>}</article>)}</div>}</section>
      <section className="panel overflow-hidden"><SectionTitle title="Documentos do caso" count={documents.length}/>{canManage&&<form action={createLegalDocumentLink} className="grid gap-3 border-b border-line bg-surface-2 p-4 md:grid-cols-2"><input type="hidden" name="case_id" value={legalCase.id}/><Field name="name" label="Nome do documento" required/><Field name="external_url" label="Link seguro" type="url" placeholder="https://..." required/><Select name="document_type" label="Tipo" options={Object.entries(DOCUMENT_LABEL)}/><div className="flex items-end"><PendingButton className="btn min-h-11" pendingLabel="Adicionando"><IconPaperclip className="h-4 w-4"/>Adicionar documento</PendingButton></div></form>}{documents.length===0?<Empty text="Nenhum documento vinculado."/>:<div className="divide-y divide-line">{documents.map(d=><a key={d.id} href={d.external_url??"#"} target="_blank" rel="noreferrer" className="nav-item flex items-center justify-between gap-3 px-5 py-4 hover:bg-brand-50"><div><p className="text-sm font-black text-ink">{d.name}</p><p className="mt-1 text-xs font-bold text-ink-muted">{DOCUMENT_LABEL[d.document_type]} · versão {d.version}</p></div><IconArrowRight className="h-4 w-4 text-brand-700"/></a>)}</div>}</section>
    </main><aside className="space-y-5">
      <section className="panel overflow-hidden"><SectionTitle title="Prazos e audiências" count={pending.length}/>{canManage&&<form action={createLegalDeadline} className="space-y-3 border-b border-line bg-surface-2 p-4"><input type="hidden" name="case_id" value={legalCase.id}/><Field name="title" label="Prazo" required placeholder="Ex.: Apresentar réplica"/><Field name="due_at" label="Data e hora" type="datetime-local" required/><Select name="assigned_to" label="Responsável" options={members.map(m=>[m.user_id,m.name??"Sem nome"])}/><div className="grid grid-cols-2 gap-3"><Select name="deadline_type" label="Tipo" options={[["procedural","Processual"],["hearing","Audiência"],["internal","Interno"],["client","Cliente"],["administrative","Administrativo"]]}/><Select name="priority" label="Prioridade" options={[["normal","Normal"],["high","Alta"],["critical","Crítica"],["low","Baixa"]]}/></div><PendingButton className="btn w-full" pendingLabel="Criando"><IconPlus className="h-4 w-4"/>Criar prazo</PendingButton></form>}{deadlines.length===0?<Empty text="Nenhum prazo cadastrado."/>:<div className="divide-y divide-line">{deadlines.map(d=><article key={d.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className={"text-sm font-black "+(d.status==="pending"&&new Date(d.due_at)<new Date()?"text-danger-600":"text-ink")}>{d.title}</p><p className="mt-1 text-xs font-bold text-ink-muted">{dateTime(d.due_at)} · {d.assigned_to?memberNames.get(d.assigned_to):"Sem responsável"}</p></div>{d.status==="completed"?<IconCheckCircle className="h-5 w-5 text-brand-700"/>:canManage&&<form action={completeLegalDeadline}><input type="hidden" name="id" value={d.id}/><input type="hidden" name="case_id" value={legalCase.id}/><PendingButton aria-label="Concluir prazo" className="nav-item grid h-11 w-11 place-items-center rounded-lg border border-line hover:bg-brand-50" iconOnly pendingLabel="Concluindo"><IconCheckCircle className="h-5 w-5"/></PendingButton></form>}</div></article>)}</div>}</section>
      {canViewFinance(jobRole,isAdmin)&&<Link href="/finance" className="nav-item panel flex items-center justify-between p-5 hover:border-brand-300 hover:bg-brand-50"><div><p className="text-sm font-black text-ink">Financeiro do caso</p><p className="mt-1 text-xs font-bold text-ink-muted">{formatBRL(open)} em aberto</p></div><IconWallet className="h-5 w-5 text-brand-700"/></Link>}
    </aside></div>
  </div>;
}
function Metric({label,value,icon:Icon}:{label:string;value:string;icon:(p:{className?:string})=>JSX.Element}){return <article className="panel p-4"><Icon className="h-5 w-5 text-brand-700"/><p className="mt-3 text-xs font-bold text-ink-muted">{label}</p><p className="mt-1 text-xl font-black text-ink">{value}</p></article>}
function Info({label,value}:{label:string;value:string}){return <div><dt className="label">{label}</dt><dd className="mt-1 text-sm font-bold text-ink">{value}</dd></div>}
function SectionTitle({title,count}:{title:string;count:number}){return <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="text-base font-black text-ink">{title}</h2><span className="tag bg-surface-2 text-ink-muted">{count}</span></div>}
function Empty({text}:{text:string}){return <p className="p-5 text-sm font-medium text-ink-muted">{text}</p>}
function Field({name,label,type="text",placeholder,required=false}:{name:string;label:string;type?:string;placeholder?:string;required?:boolean}){return <div><label className="label" htmlFor={name}>{label}{required&&<span className="text-danger-600"> *</span>}</label><input id={name} name={name} type={type} placeholder={placeholder} required={required} className="field mt-1.5"/></div>}
function Select({name,label,options}:{name:string;label:string;options:string[][]}){return <div><label className="label" htmlFor={name}>{label}</label><select id={name} name={name} className="field mt-1.5">{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></div>}
