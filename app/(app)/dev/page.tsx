import { redirect } from "next/navigation";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  Tag,
} from "@/components/app-ui";
import { BrandName } from "@/components/BrandName";
import { computeDevMetrics } from "@/lib/devMetrics";
import { formatBRL, formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PlanStatus } from "@/lib/plan";
import { SignupsBarChart } from "./SignupsBarChart";

const STATUS_META: Record<PlanStatus, { label: string; className: string }> = {
  trialing: { label: "Em teste", className: "bg-brand-50 text-brand-700" },
  active: { label: "Pagante", className: "bg-success-50 text-success-700" },
  past_due: {
    label: "Pagamento pendente",
    className: "bg-danger-50 text-danger-700",
  },
  expired: {
    label: "Teste expirado",
    className: "bg-warning-50 text-warning-700",
  },
  free: { label: "Grátis", className: "bg-surface-2 text-ink-soft" },
};

export default async function DevMetricsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!ownProfile?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data: profiles }, { data: contacts }, { data: deals }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "name,plan,plan_status,trial_ends_at,stripe_subscription_id,created_at",
        ),
      admin.from("contacts").select("owner_id"),
      admin.from("deals").select("owner_id,stage,value_cents"),
    ]);

  const metrics = computeDevMetrics(
    profiles ?? [],
    contacts ?? [],
    deals ?? [],
  );
  const activationRate =
    metrics.totalUsers > 0
      ? Math.round((metrics.activatedUsers / metrics.totalUsers) * 100)
      : 0;

  const tiles: { label: string; value: string }[] = [
    { label: "Total de usuários", value: String(metrics.totalUsers) },
    {
      label: "Ativados",
      value: `${metrics.activatedUsers} (${activationRate}%)`,
    },
    { label: "Em teste", value: String(metrics.planCounts.trialing) },
    { label: "Pagantes", value: String(metrics.planCounts.active) },
    { label: "Pagamento pendente", value: String(metrics.planCounts.past_due) },
    {
      label: "Grátis / expirado",
      value: String(metrics.planCounts.free + metrics.planCounts.expired),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Só você vê essa página"
        title={
          <>
            Métricas do <BrandName />
          </>
        }
      />

      <section className="enter grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {tiles.map((tile) => (
          <StatCard key={tile.label} label={tile.label} value={tile.value} />
        ))}
      </section>

      <SectionCard title="Novos cadastros — últimos 30 dias" className="sm:p-6">
        <SignupsBarChart series={metrics.signupsByDay} />
      </SectionCard>

      <SectionCard
        title="Cadastros recentes"
        actions={
          <Tag>
            {metrics.totalContacts} contatos · {metrics.totalDeals} negócios ·{" "}
            {formatBRL(metrics.openDealsValueCents)} em aberto
          </Tag>
        }
      >
        {metrics.recentSignups.length === 0 ? (
          <EmptyState title="Nenhum cadastro ainda." />
        ) : (
          <ul className="enter mt-4 space-y-2">
            {metrics.recentSignups.map((signup, index) => {
              const status = STATUS_META[signup.status];
              return (
                <li
                  key={`${signup.createdAt}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-3 shadow-[0_8px_28px_-24px_rgba(15,23,42,0.55)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-ink">
                      {signup.name || "Sem nome"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ink-muted">
                      {formatDate(signup.createdAt)}
                    </p>
                  </div>
                  <Tag
                    tone={
                      signup.status === "active"
                        ? "success"
                        : signup.status === "past_due"
                          ? "danger"
                          : signup.status === "expired"
                            ? "warning"
                            : signup.status === "trialing"
                              ? "brand"
                              : "muted"
                    }
                    className="shrink-0"
                  >
                    {status.label}
                  </Tag>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
