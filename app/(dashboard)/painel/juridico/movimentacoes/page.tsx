import Link from "next/link";
import { FileSearch, RefreshCw } from "lucide-react";
import { LegalMovementsList } from "@/components/legal/legal-movements-list";
import { canViewLegal } from "@/lib/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalWatchedProcess } from "@/lib/supabase/types";

export default async function LegalMovementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [orgRole, { data: membership }, { data }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("legal_watched_processes").select("*").eq("org_id", orgId).order("last_movement_at", { ascending: false, nullsFirst: false }),
  ]);

  if (!canViewLegal(membership?.job_role, orgRole === "admin")) {
    return <section className="max-w-xl rounded-xl border border-od-border bg-od-surface p-6"><h1 className="text-xl font-semibold">Acesso jurídico restrito</h1><p className="mt-2 text-sm text-od-text-2">Seu cargo não permite visualizar movimentações processuais.</p></section>;
  }

  const items = (data ?? []) as LegalWatchedProcess[];
  const unread = items.filter((item) => item.last_movement_at && (!item.seen_at || new Date(item.last_movement_at) > new Date(item.seen_at))).length;
  const failed = items.filter((item) => item.datajud_sync_failed_count > 0).length;

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-6">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-violet-300">Jurídico / Movimentações</p>
          <h1 className="mt-2 text-od-title text-od-text">Movimentações processuais</h1>
          <p className="mt-2 max-w-2xl text-sm text-od-text-2">Acompanhe o que mudou nos processos monitorados e registre cada revisão.</p>
        </div>
        <Link href="/painel/juridico/consulta" className="inline-flex min-h-11 items-center gap-2 self-start rounded-md bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-od-accent-hover lg:self-auto"><FileSearch size={16} />Consultar DataJud</Link>
      </header>

      <section className="grid border-y border-od-border sm:grid-cols-3">
        <Metric label="Monitorados" value={items.length} />
        <Metric label="Para revisar" value={unread} highlight />
        <Metric label="Sincronizações com alerta" value={failed} danger={failed > 0} />
      </section>

      <LegalMovementsList initialItems={items} />
    </div>
  );
}

function Metric({ label, value, highlight = false, danger = false }: { label: string; value: number; highlight?: boolean; danger?: boolean }) {
  return <article className="flex items-center gap-3 border-b border-od-border px-4 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><RefreshCw size={16} className={danger ? "text-[#fb7767]" : "text-violet-300"}/><div><p className="text-xs text-od-text-2">{label}</p><p className={`mt-1 text-2xl font-bold ${danger ? "text-[#fb7767]" : highlight ? "text-violet-200" : "text-od-text"}`}>{value}</p></div></article>;
}
