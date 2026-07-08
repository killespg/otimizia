import { redirect } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { IconPlus, IconTrash, IconUsers } from "../icons";
import { inviteMember, removeMember, updateMemberRole } from "./actions";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  const [members, role, { data: org }] = await Promise.all([
    getOrgMembers(supabase, orgId),
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
  ]);
  const isAdmin = role === "admin";
  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div className="max-w-2xl space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Equipe</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
          {org?.name ?? "Sua empresa"}
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
          Todo mundo aqui compartilha os mesmos contatos, vendas e lembretes.
        </p>
      </header>

      {searchParams.error && (
        <div className="rounded-md border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-bold text-danger-700">
          {searchParams.error}
        </div>
      )}

      {isAdmin && (
        <section className="panel space-y-3 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
              Convidar
            </h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              A pessoa recebe um e-mail para criar a senha e entra direto na empresa.
            </p>
          </div>
          <form action={safeInvite} className="flex flex-col gap-2 sm:flex-row">
            <input
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder="email@escritorio.com"
              className="field flex-1"
            />
            <PendingButton className="btn shrink-0" pendingLabel="Enviando">
              <IconPlus className="h-4 w-4" />
              Convidar
            </PendingButton>
          </form>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Membros
          </h2>
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-black text-ink-muted">
            {String(members.length).padStart(2, "0")}
          </span>
        </div>

        <ul className="divide-y divide-line px-5">
          {members.map((member) => {
            const isSelf = member.user_id === user.id;
            const isLastAdmin = member.role === "admin" && adminCount <= 1;
            return (
              <li key={member.user_id} className="flex items-center gap-3 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <IconUsers className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-ink">
                    {member.name || "Sem nome"}
                    {isSelf && <span className="ml-1.5 font-medium text-ink-muted">(você)</span>}
                  </p>
                  <p className="text-xs font-bold text-ink-muted">
                    {member.role === "admin" ? "Administrador" : "Membro"}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-2">
                    {(member.role !== "admin" || !isLastAdmin) && (
                      <form action={updateMemberRole}>
                        <input type="hidden" name="user_id" value={member.user_id} />
                        <input
                          type="hidden"
                          name="role"
                          value={member.role === "admin" ? "member" : "admin"}
                        />
                        <PendingButton
                          className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-surface-2"
                          pendingLabel="Salvando"
                        >
                          {member.role === "admin" ? "Rebaixar" : "Promover a admin"}
                        </PendingButton>
                      </form>
                    )}
                    {!isSelf && !isLastAdmin && (
                      <form action={removeMember}>
                        <input type="hidden" name="user_id" value={member.user_id} />
                        <PendingButton
                          className="icon-button grid h-9 w-9 place-items-center rounded-md text-ink-muted/60 hover:bg-danger-50 hover:text-danger-600"
                          title="Remover"
                          aria-label={`Remover ${member.name ?? "membro"}`}
                          iconOnly
                          pendingLabel="Removendo"
                        >
                          <IconTrash className="h-4 w-4" />
                        </PendingButton>
                      </form>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

async function safeInvite(formData: FormData) {
  "use server";
  try {
    await inviteMember(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não deu para enviar o convite.";
    redirect(`/team?error=${encodeURIComponent(message)}`);
  }
}
