import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { RealEstatePageHeader } from "@/components/real-estate/real-estate-ui";
import { canManageRealEstate, canViewRealEstate, isRealEstateV2Enabled } from "@/lib/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, RealEstateProperty, RealEstateVisit } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconCheck, IconX } from "../../icons";
import { cancelVisit, completeVisit, confirmVisit, markVisitNoShow, scheduleVisit } from "../visit-actions";

const STATUS_LABEL: Record<string, string> = {
  requested: "Solicitada pelo cliente",
  scheduled: "Agendada",
  completed: "Concluída",
  no_show: "Cliente não veio",
  cancelled: "Cancelada",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

export default async function VisitasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "real_estate_broker") notFound();

  const [orgRole, { data: membership }, { data: org }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin) || !isRealEstateV2Enabled(org)) notFound();
  const canManage = canManageRealEstate(membership?.job_role, isAdmin);

  const { data: visitRows } = await supabase
    .from("real_estate_visits")
    .select("*")
    .eq("org_id", orgId)
    .order("scheduled_at", { ascending: true, nullsFirst: true });
  const visits = (visitRows ?? []) as RealEstateVisit[];

  const propertyIds = Array.from(new Set(visits.map((v) => v.property_id)));
  const contactIds = Array.from(new Set(visits.map((v) => v.contact_id)));
  const [{ data: propertyRows }, { data: contactRows }] = await Promise.all([
    propertyIds.length > 0
      ? supabase.from("real_estate_properties").select("id, title, address_neighborhood").in("id", propertyIds)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0 ? supabase.from("contacts").select("id, name").in("id", contactIds) : Promise.resolve({ data: [] }),
  ]);
  const propertyById = new Map(((propertyRows ?? []) as Pick<RealEstateProperty, "id" | "title" | "address_neighborhood">[]).map((p) => [p.id, p]));
  const contactById = new Map(((contactRows ?? []) as Pick<Contact, "id" | "name">[]).map((c) => [c.id, c]));

  const requested = visits.filter((v) => v.status === "requested");
  const scheduled = visits.filter((v) => v.status === "scheduled");
  const history = visits.filter((v) => v.status === "completed" || v.status === "no_show" || v.status === "cancelled").slice(0, 30);

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-6">
      <RealEstatePageHeader eyebrow="Imobiliário / Agenda" title="Visitas" description="Solicitações, agenda e histórico com lembretes automáticos antes de cada compromisso." />

      {requested.length > 0 && (
        <section className="panel p-5">
          <h2 className="mb-3 text-base font-semibold text-ink">Solicitações pendentes ({requested.length})</h2>
          {/* Linha operacional: identificacao a esquerda, acao ancorada na
              direita. Empilhado, cada solicitacao ocupava tres alturas e
              deixava metade da largura vazia. */}
          <div className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
            {requested.map((visit) => (
              <div
                key={visit.id}
                className="flex flex-col gap-3 py-4 md:flex-row md:items-end md:justify-between md:gap-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{propertyById.get(visit.property_id)?.title ?? "Imóvel"}</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-ink-muted">{contactById.get(visit.contact_id)?.name ?? "Cliente"}</p>
                </div>
                {canManage && (
                  <form action={scheduleVisit} className="flex flex-wrap items-end gap-2 md:shrink-0">
                    <input type="hidden" name="visit_id" value={visit.id} />
                    <label className="block">
                      <span className="label">Data e hora</span>
                      <input type="datetime-local" name="scheduled_at" required className="field mt-1" />
                    </label>
                    <PendingButton className="btn-secondary" pendingLabel="Agendando">
                      Agendar
                    </PendingButton>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="real-estate-flat-section py-5 sm:py-6">
        <h2 className="mb-3 text-base font-semibold text-ink">Agendadas ({scheduled.length})</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm font-medium text-ink-muted">Nenhuma visita agendada.</p>
        ) : (
          <div className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
            {scheduled.map((visit) => (
              <div key={visit.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{propertyById.get(visit.property_id)?.title ?? "Imóvel"}</p>
                    <p className="text-xs font-bold text-ink-muted">
                      {contactById.get(visit.contact_id)?.name ?? "Cliente"} · {visit.scheduled_at ? formatDateTime(visit.scheduled_at) : "Sem horário"}
                    </p>
                  </div>
                  <span className="tag bg-surface-2 text-ink-muted">
                    {visit.confirmation_status === "confirmed" ? "Confirmada" : visit.confirmation_status === "declined" ? "Recusada" : "Aguardando confirmação"}
                  </span>
                </div>
                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={confirmVisit}>
                      <input type="hidden" name="visit_id" value={visit.id} />
                      <input type="hidden" name="confirmation_status" value="confirmed" />
                      <PendingButton className="press-sm rounded-md bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-800" pendingLabel="...">
                        <IconCheck className="h-3.5 w-3.5" />
                        Confirmar
                      </PendingButton>
                    </form>
                    <form action={markVisitNoShow}>
                      <input type="hidden" name="visit_id" value={visit.id} />
                      <PendingButton className="press-sm rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2" pendingLabel="...">
                        Não compareceu
                      </PendingButton>
                    </form>
                    <form action={cancelVisit}>
                      <input type="hidden" name="visit_id" value={visit.id} />
                      <PendingButton className="press-sm rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-bold text-danger-600 hover:bg-danger-50" pendingLabel="...">
                        <IconX className="h-3.5 w-3.5" />
                        Cancelar
                      </PendingButton>
                    </form>
                    <form action={completeVisit} className="flex flex-1 flex-wrap items-end gap-2">
                      <input type="hidden" name="visit_id" value={visit.id} />
                      <label className="flex-1">
                        <span className="label">Feedback (ao concluir)</span>
                        <input name="client_feedback" placeholder="O que o cliente achou?" className="field mt-1" />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
                        <input type="checkbox" name="client_interested" className="h-4 w-4" />
                        Interessado
                      </label>
                      <PendingButton className="btn-secondary shrink-0" pendingLabel="...">
                        Concluir
                      </PendingButton>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="real-estate-flat-section py-5 sm:py-6">
          <h2 className="mb-3 text-base font-semibold text-ink">Histórico</h2>
          <ul className="divide-y divide-line">
            {history.map((visit) => (
              <li key={visit.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-bold text-ink">{propertyById.get(visit.property_id)?.title ?? "Imóvel"}</span>
                <span className="text-xs font-bold text-ink-muted">{STATUS_LABEL[visit.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/painel/imoveis" className="nav-item inline-block text-sm font-semibold text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}
