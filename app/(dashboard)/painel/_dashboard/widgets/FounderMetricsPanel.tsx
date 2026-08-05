import Link from "next/link";
import { BrandName } from "@/components/design-system/BrandName";
import { computeDevMetrics, type DevMetrics } from "@/lib/utils/devMetrics";
import { createAdminClient } from "@/lib/supabase/admin";
import { IconArrowRight } from "../../icons";

// Métricas do produto como um todo (todas as organizações) — só para a conta
// fundadora (is_admin), por isso usa o admin client em vez de filtrar por org.
export async function loadFounderMetrics(): Promise<DevMetrics> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: contacts }, { data: deals }] = await Promise.all([
    admin
      .from("profiles")
      .select("name,plan,plan_status,trial_ends_at,stripe_subscription_id,created_at"),
    admin.from("contacts").select("owner_id"),
    admin.from("deals").select("owner_id,stage,value_cents"),
  ]);
  return computeDevMetrics(profiles ?? [], contacts ?? [], deals ?? []);
}

export function FounderMetricsPanel({ metrics }: { metrics: DevMetrics }) {
  const activationRate =
    metrics.totalUsers > 0 ? Math.round((metrics.activatedUsers / metrics.totalUsers) * 100) : 0;
  const tiles = [
    { label: "Cadastros totais", value: String(metrics.totalUsers) },
    { label: "Ativados", value: `${metrics.activatedUsers} (${activationRate}%)` },
    { label: "Em teste", value: String(metrics.planCounts.trialing) },
    { label: "Pagantes", value: String(metrics.planCounts.active) },
  ];

  return (
    <section className="enter rounded-md border border-brand-200 bg-brand-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-brand-800">Métricas do <BrandName /></p>
        <Link
          href="/painel/metricas"
          className="nav-item inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:text-brand-900"
        >
          Ver tudo
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-md border border-brand-200 bg-od-surface p-3">
            <p className="text-xs font-semibold text-od-text-2">{tile.label}</p>
            <p className="mt-1 text-lg font-black leading-none tracking-[-0.02em] text-od-text">
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
