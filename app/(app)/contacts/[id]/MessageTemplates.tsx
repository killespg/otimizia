"use client";

import { useState } from "react";
import type { MessageTemplate } from "@/lib/professions";
import { IconCheck, IconMessage } from "../../icons";

type Props = {
  templates: MessageTemplate[];
  contactName: string;
  contactPhone: string | null;
  myName: string;
  contactCompany: string | null;
};

export function MessageTemplates({
  templates,
  contactName,
  contactPhone,
  myName,
  contactCompany,
}: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(templates[0]?.key ?? null);
  const [text, setText] = useState(() => fillTemplate(templates[0], {
    contactName,
    myName,
    contactCompany,
  }));
  const [copied, setCopied] = useState(false);

  if (templates.length === 0) return null;

  const digits = (contactPhone ?? "").replace(/\D/g, "");
  const whatsappDigits = digits.length > 0 && digits.length <= 11 ? `55${digits}` : digits;
  const canWhatsapp = whatsappDigits.length >= 10;

  function selectTemplate(template: MessageTemplate) {
    setActiveKey(template.key);
    setText(fillTemplate(template, { contactName, myName, contactCompany }));
    setCopied(false);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — o usuário ainda pode selecionar e copiar manualmente
    }
  }

  function openWhatsapp() {
    const url = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-black tracking-[-0.02em] text-ink">Mensagens prontas</h2>
        <p className="mt-1 text-sm font-medium text-ink-muted">
          Escolha um modelo, ajuste se precisar e envie por WhatsApp.
        </p>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => selectTemplate(template)}
              className={
                "press-sm min-h-9 rounded-md border px-3 py-1.5 text-xs font-bold transition " +
                (activeKey === template.key
                  ? "border-brand-400 bg-brand-50 text-brand-800"
                  : "border-line bg-white text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800")
              }
            >
              {template.label}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          className="field mt-3 min-h-[104px] w-full resize-y"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyText}
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-black text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            {copied ? <IconCheck className="h-4 w-4" /> : null}
            {copied ? "Copiado!" : "Copiar"}
          </button>
          <button
            type="button"
            onClick={openWhatsapp}
            disabled={!canWhatsapp}
            title={canWhatsapp ? undefined : "Cadastre um telefone para enviar por WhatsApp"}
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-black text-white shadow-[0_14px_30px_-16px_rgba(109,40,217,0.9)] hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconMessage className="h-4 w-4" />
            Abrir WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
}

function fillTemplate(
  template: MessageTemplate | undefined,
  vars: { contactName: string; myName: string; contactCompany: string | null }
) {
  if (!template) return "";
  const primeiroNome = vars.contactName.trim().split(/\s+/)[0] ?? vars.contactName;
  const map: Record<string, string> = {
    primeiro_nome: primeiroNome,
    nome: vars.contactName,
    empresa: vars.contactCompany ?? "",
    meu_nome: vars.myName,
  };
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => map[key] ?? "");
}
