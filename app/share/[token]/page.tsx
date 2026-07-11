import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Fora do grupo (app): não cai em nenhum prefixo protegido de
// lib/supabase/middleware.ts, então é público por padrão — sem sessão, sem
// cookies, só a anon key. get_shared_case() nunca retorna dado financeiro
// nem storage_path (só external_url), e só o que foi marcado como
// client_visible pela equipe aparece aqui.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  intake: "Triagem", active: "Em andamento", waiting: "Aguardando",
  suspended: "Suspenso", closed: "Encerrado", archived: "Arquivado",
};
const DEADLINE_TYPE_LABEL: Record<string, string> = {
  procedural: "Processual", hearing: "Audiência", internal: "Interno", client: "Cliente", administrative: "Administrativo",
};
const EVENT_TYPE_LABEL: Record<string, string> = {
  update: "Andamento", filing: "Protocolo", decision: "Decisão", hearing: "Audiência", communication: "Comunicação", note: "Nota",
};

type SharedCase = {
  case: { title: string; status: string; area: string | null; court: string | null; jurisdiction: string | null; next_deadline_at: string | null };
  deadlines: { title: string; due_at: string; status: string; deadline_type: string }[];
  events: { title: string; description: string | null; occurred_at: string; event_type: string }[];
  documents: { name: string; document_type: string; external_url: string }[];
};

export default async function SharedCasePage({ params }: { params: { token: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.token)) notFound();

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.rpc("get_shared_case", { p_token: params.token });
  if (error || !data) notFound();
  const shared = data as SharedCase;

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-8">
      <header className="panel p-5 sm:p-6">
        <p className="text-sm font-black text-brand-700">{shared.case.area ?? "Acompanhamento do caso"}</p>
        <h1 className="mt-2 text-[clamp(1.6rem,5vw,2.6rem)] font-black tracking-[-.04em] text-ink">{shared.case.title}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="tag bg-brand-50 text-brand-700">{STATUS_LABEL[shared.case.status] ?? shared.case.status}</span>
          {shared.case.court && <span className="tag bg-surface-2 text-ink-muted">{shared.case.court}</span>}
          {shared.case.jurisdiction && <span className="tag bg-surface-2 text-ink-muted">{shared.case.jurisdiction}</span>}
        </div>
      </header>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-base font-black text-ink">Prazos</h2>
        {shared.deadlines.length === 0 ? (
          <p className="p-5 text-sm font-medium text-ink-muted">Nenhum prazo compartilhado ainda.</p>
        ) : (
          <div className="divide-y divide-line">
            {shared.deadlines.map((item, index) => (
              <div key={index} className="p-4">
                <p className="text-sm font-black text-ink">{item.title}</p>
                <p className="mt-1 text-xs font-bold text-ink-muted">
                  {DEADLINE_TYPE_LABEL[item.deadline_type] ?? item.deadline_type} ·{" "}
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.due_at))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-base font-black text-ink">Movimentações</h2>
        {shared.events.length === 0 ? (
          <p className="p-5 text-sm font-medium text-ink-muted">Nenhuma movimentação compartilhada ainda.</p>
        ) : (
          <div className="divide-y divide-line">
            {shared.events.map((item, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="tag bg-brand-50 text-brand-700">{EVENT_TYPE_LABEL[item.event_type] ?? item.event_type}</span>
                  <time className="text-xs font-bold text-ink-muted">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(item.occurred_at))}
                  </time>
                </div>
                <p className="mt-2 text-sm font-black text-ink">{item.title}</p>
                {item.description && <p className="mt-1 text-sm font-medium text-ink-soft">{item.description}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {shared.documents.length > 0 && (
        <section className="panel overflow-hidden">
          <h2 className="border-b border-line px-5 py-4 text-base font-black text-ink">Documentos</h2>
          <div className="divide-y divide-line">
            {shared.documents.map((item, index) => (
              <a
                key={index}
                href={item.external_url}
                target="_blank"
                rel="noreferrer"
                className="block px-5 py-4 text-sm font-black text-brand-700 hover:bg-brand-50"
              >
                {item.name}
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs font-medium text-ink-muted">Link somente leitura, compartilhado pelo seu escritório.</p>
    </div>
  );
}
