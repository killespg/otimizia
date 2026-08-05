import { redirect } from "next/navigation";
import { BrandName } from "@/components/design-system/BrandName";
import { computeDevMetrics } from "@/lib/utils/devMetrics";
import { formatBRL, formatDate } from "@/lib/utils/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PlanStatus } from "@/lib/billing/plan";
import { SignupsBarChart } from "./SignupsBarChart";

const STATUS_META: Record<PlanStatus, { label: string; className: string }> = {
  trialing: { label: "Em teste", className: "bg-brand-50 text-brand-700" },
  active: { label: "Pagante", className: "bg-success-50 text-success-700" },
  past_due: { label: "Pagamento pendente", className: "bg-danger-50 text-danger-700" },
  expired: { label: "Teste expirado", className: "bg-warning-50 text-warning-700" },
  free: { label: "Grátis", className: "bg-surface-2 text-ink-soft" },
};

export default async function DevMetricsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!ownProfile?.is_admin) redirect("/painel");

  const admin = createAdminClient();
  const [{ data: profiles }, { data: contacts }, { data: deals }] = await Promise.all([
    admin
      .from("profiles")
      .select("name,plan,plan_status,trial_ends_at,stripe_subscription_id,created_at"),
    admin.from("contacts").select("owner_id"),
    admin.from("deals").select("owner_id,stage,value_cents"),
  ]);

  const metrics = computeDevMetrics(profiles ?? [], contacts ?? [], deals ?? []);
  const activationRate =
    metrics.totalUsers > 0 ? Math.round((metrics.activatedUsers / metrics.totalUsers) * 100) : 0;

  const tiles: { label: string; value: string }[] = [
    { label: "Total de usuários", value: String(metrics.totalUsers) },
    { label: "Ativados", value: `${metrics.activatedUsers} (${activationRate}%)` },
    { label: "Em teste", value: String(metrics.planCounts.trialing) },
    { label: "Pagantes", value: String(metrics.planCounts.active) },
    { label: "Pagamento pendente", value: String(metrics.planCounts.past_due) },
    { label: "Grátis / expirado", value: String(metrics.planCounts.free + metrics.planCounts.expired) },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Só você vê essa página</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
          Métricas do <BrandName />
        </h1>
      </header>

      <section className="enter grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {tiles.map((tile) => (
          <article key={tile.label} className="panel p-3 sm:p-5">
            <p className="text-xs font-semibold text-ink-soft sm:text-sm">{tile.label}</p>
            <p className="mt-2 text-xl font-black leading-none tracking-[-0.03em] text-ink sm:mt-3 sm:text-2xl">
              {tile.value}
            </p>
          </article>
        ))}
      </section>

      <section data-reveal className="panel p-4 sm:p-6">
        <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
          Novos cadastros — últimos 30 dias
        </h2>
        <SignupsBarChart series={metrics.signupsByDay} />
      </section>

      <section data-reveal className="panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Cadastros recentes
          </h2>
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-black text-ink-muted">
            {metrics.totalContacts} contatos · {metrics.totalDeals} negócios ·{" "}
            {formatBRL(metrics.openDealsValueCents)} em aberto
          </span>
        </div>

        {metrics.recentSignups.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-line bg-od-muted-surface px-3 py-8 text-center text-sm font-medium text-ink-muted">
            Nenhum cadastro ainda.
          </p>
        ) : (
          <ul className="enter mt-4 divide-y divide-white/[0.06]">
            {metrics.recentSignups.map((signup, index) => {
              const status = STATUS_META[signup.status];
              return (
                <li
                  key={`${signup.createdAt}-${index}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-ink">
                      {signup.name || "Sem nome"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ink-muted">
                      {formatDate(signup.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-black ${status.className}`}>
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

