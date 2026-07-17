import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { IconArrowRight, IconTrash } from "../../icons";
import { createApiKey, createWebhookEndpoint, revokeApiKey, toggleWebhookEndpoint } from "../integrations-actions";
import { NewSecretBanner } from "./NewSecretBanner";

const EVENT_TYPES: { key: string; label: string }[] = [
  { key: "deal.created", label: "Negócio criado" },
  { key: "deal.stage_changed", label: "Etapa do negócio mudou" },
];

export default async function IntegrationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") redirect("/settings");

  const [{ data: apiKeys }, { data: webhooks }] = await Promise.all([
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, revoked_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("webhook_endpoints")
      .select("id, url, event_types, active, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter rounded-lg border border-line bg-surface p-5 sm:p-6">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink">
          <IconArrowRight className="h-4 w-4 rotate-180" />
          Voltar para Configurações
        </Link>
        <h1 className="mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink">
          Integrações
        </h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Chaves de API (leitura) e webhooks para conectar com Zapier, Make, n8n ou uma integração
          própria. Só administradores da organização veem esta página.
        </p>
      </header>

      <NewSecretBanner />

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-black tracking-[-0.02em] text-ink">Chaves de API</h2>
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          Só leitura por enquanto — <code>GET /api/v1/deals</code> e <code>GET /api/v1/contacts</code>,
          autenticado com <code>Authorization: Bearer &lt;chave&gt;</code>.
        </p>

        <form action={createApiKey} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input name="name" placeholder="Nome da chave (ex: Zapier)" maxLength={120} className="field flex-1" />
          <PendingButton className="btn shrink-0" pendingLabel="Criando">
            Criar chave
          </PendingButton>
        </form>

        <ul className="mt-4 space-y-2">
          {(apiKeys ?? []).map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{key.name}</p>
                <p className="text-xs font-semibold text-ink-muted">
                  {key.key_prefix}… · {key.revoked_at ? "revogada" : "ativa"}
                  {key.last_used_at ? ` · usada por último em ${new Date(key.last_used_at).toLocaleDateString("pt-BR")}` : ""}
                </p>
              </div>
              {!key.revoked_at && (
                <form action={revokeApiKey}>
                  <input type="hidden" name="id" value={key.id} />
                  <PendingButton
                    className="icon-button grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-muted/60 hover:bg-danger-50 hover:text-danger-600"
                    aria-label={`Revogar chave ${key.name}`}
                    iconOnly
                    pendingLabel="Revogando"
                  >
                    <IconTrash className="h-4 w-4" />
                  </PendingButton>
                </form>
              )}
            </li>
          ))}
          {(apiKeys ?? []).length === 0 && (
            <li className="text-sm font-medium text-ink-muted">Nenhuma chave criada ainda.</li>
          )}
        </ul>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-base font-black tracking-[-0.02em] text-ink">Webhooks</h2>
        <p className="mt-1 text-xs font-semibold text-ink-muted">
          Notificamos sua URL quando o evento acontece. O corpo vem assinado (HMAC-SHA256) no header{" "}
          <code>X-Otimizia-Signature</code>, calculado com o secret mostrado na criação.
        </p>

        <form action={createWebhookEndpoint} className="mt-4 space-y-2">
          <input name="url" type="url" required placeholder="https://sua-integracao.com/webhook" className="field w-full" />
          <div className="flex flex-wrap gap-3">
            {EVENT_TYPES.map((type) => (
              <label key={type.key} className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <input type="checkbox" name={`event_${type.key}`} defaultChecked className="h-4 w-4 rounded border-line" />
                {type.label}
              </label>
            ))}
          </div>
          <PendingButton className="btn" pendingLabel="Criando">
            Criar webhook
          </PendingButton>
        </form>

        <ul className="mt-4 space-y-2">
          {(webhooks ?? []).map((endpoint) => (
            <li key={endpoint.id} className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-black text-ink">{endpoint.url}</p>
                <form action={toggleWebhookEndpoint}>
                  <input type="hidden" name="id" value={endpoint.id} />
                  <input type="hidden" name="active" value={endpoint.active ? "" : "on"} />
                  <PendingButton className="btn-soft shrink-0" pendingLabel="Salvando">
                    {endpoint.active ? "Desativar" : "Ativar"}
                  </PendingButton>
                </form>
              </div>
              <p className="mt-1 text-xs font-semibold text-ink-muted">
                {(endpoint.event_types as string[]).join(", ")} · {endpoint.active ? "ativo" : "inativo"}
              </p>
            </li>
          ))}
          {(webhooks ?? []).length === 0 && (
            <li className="text-sm font-medium text-ink-muted">Nenhum webhook criado ainda.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
