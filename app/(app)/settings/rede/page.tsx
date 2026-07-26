import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { NetworkBenchmarkRow } from "@/lib/supabase/types";
import { IconArrowRight } from "../../icons";

// 5.2 (Fase 5): administração multiunidade. Vincular organizações como
// unidades de uma rede é ação de operação (service role) — não existe
// formulário de auto-serviço aqui, mesmo padrão de real_estate_v2_enabled
// e granular_rbac_enabled. Esta página só mostra o benchmark quando o
// vínculo já foi feito pela operação.
export default async function NetworkAdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") redirect("/settings");

  const { data: org } = await supabase.from("organizations").select("parent_org_id").eq("id", orgId).maybeSingle();

  // Se esta organização é uma unidade (tem parent_org_id), o benchmark é
  // visto pelo admin da matriz, não daqui — evita um admin de unidade
  // filha pedir o benchmark da própria matriz (que compararia com outras
  // unidades irmãs que não são dele).
  const benchmarkOrgId = org?.parent_org_id ? null : orgId;
  const { data: rows } = benchmarkOrgId
    ? await supabase.rpc("get_network_benchmark", { p_parent_org_id: benchmarkOrgId })
    : { data: null };
  const benchmark = (rows ?? []) as NetworkBenchmarkRow[];

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter rounded-lg border border-line bg-surface p-5 sm:p-6">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink">
          <IconArrowRight className="h-4 w-4 rotate-180" />
          Voltar para Configurações
        </Link>
        <h1 className="mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink">
          Rede de unidades
        </h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Só contagens agregadas por unidade — nunca contato ou negócio individual de outra
          organização. Vincular uma unidade nova é feito pela operação, não por aqui.
        </p>
      </header>

      {org?.parent_org_id ? (
        <div className="panel p-8 text-center">
          <p className="text-sm font-black text-ink">Esta organização é uma unidade de uma rede.</p>
          <p className="mt-1 text-sm font-medium text-ink-muted">O benchmark é visto pelo administrador da matriz.</p>
        </div>
      ) : benchmark.length <= 1 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm font-black text-ink">Nenhuma unidade vinculada ainda.</p>
          <p className="mt-1 text-sm font-medium text-ink-muted">
            Fale com o time do OtimizIA para vincular outra organização como unidade desta rede.
          </p>
        </div>
      ) : (
        <section className="panel overflow-x-auto p-5 sm:p-6">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-muted">
                <th className="border-b border-line pb-2">Unidade</th>
                <th className="border-b border-line pb-2">Contatos</th>
                <th className="border-b border-line pb-2">Negócios</th>
                <th className="border-b border-line pb-2">Em aberto</th>
                <th className="border-b border-line pb-2">Ganhos (30d)</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.map((row) => (
                <tr key={row.org_id}>
                  <td className="border-b border-line py-2 font-bold text-ink">{row.org_name}</td>
                  <td className="border-b border-line py-2 text-ink-soft">{row.total_contacts}</td>
                  <td className="border-b border-line py-2 text-ink-soft">{row.total_deals}</td>
                  <td className="border-b border-line py-2 text-ink-soft">{row.open_deals}</td>
                  <td className="border-b border-line py-2 text-ink-soft">{row.won_deals_30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
