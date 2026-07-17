import Link from "next/link";
import { mergeContacts } from "../../actions";
import { PendingButton } from "@/components/PendingButton";
import { findDuplicateContacts } from "@/lib/contact-quality";
import { getActiveOrgId } from "@/lib/org";
import { getProfessionPreset } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { getWorkspaceLabels } from "@/lib/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconArrowRight } from "../../icons";

export default async function DuplicateContactsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [{ data: profile }, { data: org }] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user!.id).maybeSingle(),
    supabase.from("organizations").select("workspace_preferences").eq("id", orgId).maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  const workspaceLabels = getWorkspaceLabels(preset, org?.workspace_preferences, workspaceKey);

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, phone, email")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);

  const suggestions = findDuplicateContacts((contacts ?? []) as Pick<Contact, "id" | "name" | "phone" | "email">[]);

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter rounded-lg border border-line bg-surface p-5 sm:p-6">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink"
        >
          <IconArrowRight className="h-4 w-4 rotate-180" />
          Voltar para {workspaceLabels.contacts}
        </Link>
        <h1 className="mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink">
          Possíveis duplicatas
        </h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Contatos com o mesmo telefone, e-mail ou nome. Mesclar move negócios, tarefas, conversas e
          ligações registradas para o contato escolhido e apaga o outro — não dá pra desfazer.
        </p>
      </header>

      {suggestions.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm font-black text-ink">Nenhuma duplicata encontrada.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li key={`${s.contactA.id}-${s.contactB.id}`} className="panel p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-warning-700">{s.reason}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  { keep: s.contactA, merge: s.contactB },
                  { keep: s.contactB, merge: s.contactA },
                ].map(({ keep, merge }) => (
                  <div key={keep.id} className="rounded-lg border border-line bg-white p-3 text-sm">
                    <p className="text-safe truncate font-black text-ink">{keep.name}</p>
                    <p className="text-xs font-semibold text-ink-muted">
                      {keep.phone || "sem telefone"} · {keep.email || "sem e-mail"}
                    </p>
                    <form action={mergeContacts} className="mt-2">
                      <input type="hidden" name="keep_id" value={keep.id} />
                      <input type="hidden" name="merge_id" value={merge.id} />
                      <PendingButton className="btn-soft w-full" pendingLabel="Mesclando">
                        Manter este, mesclar o outro aqui
                      </PendingButton>
                    </form>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
