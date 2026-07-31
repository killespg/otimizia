"use client";

import { useEffect, useRef } from "react";
import { PendingButton } from "@/components/ui/PendingButton";
import { updateOrganizationContext } from "@/app/(dashboard)/painel/equipe/actions";
import type { Organization } from "@/lib/supabase/types";

// Painel de personalização do Tim: reaproveita o mesmo formulário e a mesma
// ação de servidor já usados em /painel/equipe — só traz pra dentro da
// conversa, onde o contexto e o "jeito de falar" realmente importam. Não
// duplica lógica nova: é a mesma fonte de verdade do prompt do Tim.
export function TimContextPanel({
  open,
  onClose,
  org,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  org: Organization | null;
  isAdmin: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar personalização"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Personalizar o Tim"
        className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden border-l border-white/[0.09] bg-[#1a1820]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold text-white">Personalizar o Tim</p>
            <p className="mt-0.5 text-[12px] text-od-text-3">
              Isso ajuda o Tim a entender sua empresa, o jeito que ele deve falar com vocês, e dar respostas melhores.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded text-lg leading-none text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isAdmin ? (
            <form action={updateOrganizationContext} className="space-y-4">
              <Field
                name="organization_name"
                label="Nome da empresa/operação"
                defaultValue={org?.name ?? ""}
                required
                maxLength={120}
              />
              <TextAreaField
                name="ai_tone"
                label="Como o Tim deve falar com vocês"
                defaultValue={org?.ai_tone ?? ""}
                maxLength={600}
                rows={2}
                placeholder="Ex.: direto, informal, me chama pelo primeiro nome, sem enrolar, pode dar opinião."
              />
              <TextAreaField
                name="business_context"
                label="Contexto do negócio"
                defaultValue={org?.business_context ?? ""}
                maxLength={1200}
                rows={4}
                placeholder="O que vende, para quem, região, diferenciais, perfil dos clientes..."
              />
              <TextAreaField
                name="business_priorities"
                label="Prioridades"
                defaultValue={org?.business_priorities ?? ""}
                maxLength={1200}
                rows={3}
                placeholder="Ex.: priorizar leads quentes, recuperar perdidos, acompanhar comissões..."
              />
              <TextAreaField
                name="ai_instructions"
                label="Instruções para o Tim"
                defaultValue={org?.ai_instructions ?? ""}
                maxLength={1200}
                rows={4}
                placeholder="Regras internas, cuidados ao falar com clientes, coisas que não podem ser esquecidas..."
              />
              <TextAreaField
                name="extra_notes"
                label="Outras informações"
                defaultValue={org?.extra_notes ?? ""}
                maxLength={1200}
                rows={3}
                placeholder="Qualquer outra coisa que o Tim deveria saber."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="industry" label="Segmento/setor" defaultValue={org?.industry ?? ""} maxLength={120} />
                <Field name="region" label="Região de atuação" defaultValue={org?.region ?? ""} maxLength={120} />
                <Field name="team_size" label="Tamanho da equipe" defaultValue={org?.team_size ?? ""} maxLength={60} />
                <Field name="website" label="Site ou link útil" defaultValue={org?.website ?? ""} maxLength={200} />
              </div>
              <PendingButton className="btn w-full justify-center" pendingLabel="Salvando">
                Salvar personalização
              </PendingButton>
            </form>
          ) : (
            <div className="space-y-3 text-sm font-medium text-white/60">
              <p>O contexto do Tim é definido por um admin da empresa e vale pra todo mundo que conversa com ele.</p>
              {org?.ai_tone ? (
                <div className="rounded border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                  <span className="label">Jeito de falar</span>
                  <p className="mt-1 text-[13px] text-white/80">{org.ai_tone}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  required = false,
  defaultValue,
  maxLength,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className="field mt-1.5"
      />
    </div>
  );
}

function TextAreaField({
  name,
  label,
  defaultValue,
  maxLength,
  rows = 3,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        className="field mt-1.5"
      />
    </div>
  );
}
