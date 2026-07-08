import { redirect } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";

export default async function UpgradePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  const [access, role] = await Promise.all([
    getUserPlanAccess(supabase, user.id),
    getOrgRole(supabase, orgId, user.id),
  ]);
  const isAdmin = role === "admin";

  if (access.hasAccess) redirect("/dashboard");

  const title =
    access.status === "expired" ? "Seu teste grátis acabou" : "Assine pra continuar";

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[linear-gradient(135deg,#b518ff_0%,#5c22e8_43%,#0bbfe8_100%)] p-4">
      <div className="panel w-full max-w-md space-y-5 p-8 text-center">
        <div>
          <p className="text-sm font-black text-brand-700">OtimizIA</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">
            {title}
          </h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
            {isAdmin
              ? "Assine o plano Pro para voltar a acessar seus contatos, negócios e lembretes."
              : "Peça a um administrador da empresa para renovar a assinatura — assim todo mundo volta a ter acesso."}
          </p>
        </div>

        {isAdmin && (
          <form action="/api/billing/checkout" method="POST">
            <PendingButton className="btn w-full py-3 text-base" pendingLabel="Abrindo">
              Assinar Pro — R$ 39,90/mês por pessoa
            </PendingButton>
          </form>
        )}

        <form action={logout}>
          <PendingButton
            className="nav-item w-full text-sm font-bold text-ink-muted hover:text-ink"
            pendingLabel="Saindo"
          >
            Sair da conta
          </PendingButton>
        </form>
      </div>
    </main>
  );
}
