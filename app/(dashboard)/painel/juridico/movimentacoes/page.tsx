import Link from "next/link";
import { FileSearch, RefreshCw } from "lucide-react";
import { LegalMovementsList } from "@/components/legal/legal-movements-list";
import { canViewLegal } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalWatchedProcess } from "@/lib/supabase/types";

export default async function LegalMovementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [orgRole, { data: membership }, { data }, { data: caseRows }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("legal_watched_processes").select("*").eq("org_id", orgId).order("last_movement_at", { ascending: false, nullsFirst: false }),
    supabase.from("legal_cases").select("id, slug").eq("org_id", orgId),
  ]);

  if (!canViewLegal(membership?.job_role, orgRole === "admin")) {
    return <section className="max-w-xl rounded-xl border border-od-border bg-od-surface p-6"><h1 className="text-xl font-semibold">Acesso jurídico restrito</h1><p className="mt-2 text-sm text-od-text-2">Seu cargo não permite visualizar movimentações processuais.</p></section>;
  }

  const caseSlugById = new Map((caseRows ?? []).map((item) => [item.id as string, item.slug as string]));
  const items = ((data ?? []) as LegalWatchedProcess[]).map((item) => ({
    ...item,
    case_slug: item.case_id ? caseSlugById.get(item.case_id) : undefined,
  }));
  const unread = items.filter((item) => item.last_movement_at && (!item.seen_at || new Date(item.last_movement_at) > new Date(item.seen_at))).length;
  const failed = items.filter((item) => item.datajud_sync_failed_count > 0).length;

  return (
    <div className="ui-page">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xs font-semibold text-od-text-2">Jurídico / Movimentações</h1>
          <p className="mt-1 max-w-2xl text-sm text-od-text-2">Acompanhe o que mudou nos processos monitorados e registre cada revisão.</p>
        </div>
        <Link href="/juridico/processos#datajud" className="inline-flex min-h-11 items-center gap-2 self-start rounded-[var(--radius-control)] bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-brand-600 lg:self-auto"><FileSearch size={16} />Consultar DataJud</Link>
      </header>

      <section className="ui-metric-band sm:grid-cols-3">
        <Metric label="Monitorados" value={items.length} />
        <Metric label="Para revisar" value={unread} highlight />
        <Metric label="Sincronizações com alerta" value={failed} danger={failed > 0} />
      </section>

      <LegalMovementsList initialItems={items} />
    </div>
  );
}

function Metric({ label, value, highlight = false, danger = false }: { label: string; value: number; highlight?: boolean; danger?: boolean }) {
  return <article className="flex items-center gap-3 border-b border-od-border px-4 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><RefreshCw size={16} className={danger ? "text-[#fb7767]" : "text-od-text-2"}/><div><p className="text-xs text-od-text-2">{label}</p><p className={`mt-1 text-2xl font-bold ${danger ? "text-[#fb7767]" : highlight ? "text-od-text" : "text-od-text"}`}>{value}</p></div></article>;
}
