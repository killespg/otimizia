import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleUserRound,
  Handshake,
  Home,
  PackageSearch,
  Scale,
  Store,
  Tractor,
} from "lucide-react";
import { getProfessionPreset, type ProfessionType } from "@/lib/people/professions";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey, getWorkspaceOptions } from "@/lib/workspace/workspaces";
import { updateProfession } from "../actions";
import { WorkspaceSubmitButton } from "./WorkspaceSubmitButton";

const icons: Record<Exclude<ProfessionType, "founder">, typeof Scale> = {
  autonomous_seller: Handshake,
  law_office: Scale,
  real_estate_broker: Home,
  service_provider: BriefcaseBusiness,
  consultant: CircleUserRound,
  freelancer: PackageSearch,
  livestock_producer: Tractor,
  small_business: Store,
  other: Building2,
};

const notes: Record<Exclude<ProfessionType, "founder">, string> = {
  autonomous_seller: "Catálogo, vendas, pedidos e pós-venda",
  law_office: "Processos, prazos, documentos e financeiro",
  real_estate_broker: "Imóveis, visitas, propostas e comissões",
  service_provider: "Clientes, serviços, agenda e retornos",
  consultant: "Projetos, contratos, entregas e follow-ups",
  freelancer: "Trabalhos, clientes, prazos e recebimentos",
  livestock_producer: "Carteira rural, lotes e negociações",
  small_business: "Operação comercial, pedidos e relacionamento",
  other: "CRM configurável para sua operação",
};

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, profession_types, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const activeWorkspace = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin ?? false,
  );

  if (activeWorkspace === "founder") {
    return (
      <section className="mx-auto w-full max-w-3xl py-8 md:py-12">
        <p className="text-sm font-semibold text-od-text-2">Área interna</p>
        <h1 className="mt-3 text-od-title text-od-text">Workspace do fundador</h1>
        <p className="mt-3 max-w-2xl text-od-body text-od-text-2">
          Sua conta usa o contexto interno do OtimizIA e não alterna entre as
          áreas comerciais.
        </p>
        <Link
          href="/painel"
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md bg-od-accent px-4 text-sm font-semibold text-white hover:bg-brand-600 focus-visible:shadow-focus"
        >
          Voltar ao painel
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  const workspaceOptions = getWorkspaceOptions(
    profile?.profession_types,
    activeWorkspace,
  );

  return (
    <section className="mx-auto w-full max-w-5xl py-6 md:py-10">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-od-text-2">Áreas habilitadas</p>
        <h1 className="mt-3 text-od-title text-od-text">
          Escolha onde você vai trabalhar
        </h1>
        <p className="mt-3 max-w-2xl text-od-body text-od-text-2">
          Cada área mantém contatos, vendas, tarefas e conversas separados.
          Ative uma delas para abrir o painel e os dados correspondentes.
        </p>
      </header>

      <div className="mt-8 divide-y divide-od-border border-y border-od-border">
        {workspaceOptions.map((option) => {
          const key = option.value as Exclude<ProfessionType, "founder">;
          const preset = getProfessionPreset(key);
          const Icon = icons[key];
          const isActive = key === activeWorkspace;

          return (
            <article
              key={key}
              className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-md bg-od-muted-surface text-od-text-2">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-od-text">
                      {option.label}
                    </h2>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-control bg-od-accent-tint px-2 py-1 text-xs font-semibold text-od-accent-soft">
                        <Check size={13} aria-hidden="true" />
                        Em uso
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-od-text-2">
                    {notes[key]}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-od-text-3">
                    {preset.pipelineDescription}
                  </p>
                </div>
              </div>

              {isActive ? (
                <Link
                  href="/painel"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-od-border px-4 text-sm font-semibold text-od-text hover:border-od-border-hover hover:bg-od-muted-surface"
                >
                  Abrir painel
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <form action={updateProfession} className="shrink-0">
                  <input type="hidden" name="profession_type" value={key} />
                  <input type="hidden" name="return_to" value="/painel" />
                  <WorkspaceSubmitButton label={`Ativar ${option.label}`} />
                </form>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-6 text-od-text-2">
        Para habilitar ou remover uma área, use{" "}
        <Link
          href="/painel/configuracoes"
          className="font-semibold text-od-accent-soft underline decoration-od-accent/50 underline-offset-4 hover:text-od-text"
        >
          Configurações
        </Link>
        . Mudar de área nunca mistura os registros.
      </p>
    </section>
  );
}
