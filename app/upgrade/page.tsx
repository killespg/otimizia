import { redirect } from "next/navigation";
import { BrandName } from "@/components/design-system/BrandName";
import { PendingButton } from "@/components/ui/PendingButton";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { getUserPlanAccess } from "@/lib/billing/plan-access";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";

export default async function UpgradePage() {
  const supabase = await createClient();
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

  if (access.hasAccess) redirect("/painel");

  const title =
    access.status === "expired" ? "Seu teste grátis acabou" : "Assine pra continuar";

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-od-bg p-4">
      <div className="w-full max-w-md border-y border-white/[0.09] py-10 text-center">
        <div>
          <p className="text-sm font-black text-ink"><BrandName /></p>
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
              Assinar Pro — R$ 39,90/mês + R$ 10 por pessoa extra
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
