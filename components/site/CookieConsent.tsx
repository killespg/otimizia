"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ALL_CATEGORIES, ESSENTIAL_ONLY, type ConsentCategories } from "@/lib/consent/consent";
import {
  CONSENT_OPEN_EVENT,
  createVisitorId,
  openConsentPreferences,
  readConsent,
  saveConsent,
} from "@/lib/consent/consent-browser";

// Banner de consentimento. Fica fechado por padrão e só abre depois que o
// cliente hidrata e confirma que não existe cookie válido — assim o HTML do
// servidor é igual para todo mundo (cacheável) e ninguém vê o banner piscar
// depois de já ter respondido.
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const visitorId = useRef<string | null>(null);

  useEffect(() => {
    const existing = readConsent();
    visitorId.current = existing?.visitorId ?? createVisitorId();
    const openFrame = existing ? null : window.requestAnimationFrame(() => setOpen(true));

    const reopen = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setDetailed(true);
      setFailed(false);
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => {
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
    };
  }, []);

  const choose = useCallback(async (categories: ConsentCategories) => {
    if (!visitorId.current) return;
    setSaving(true);
    setFailed(false);
    const saved = await saveConsent(visitorId.current, categories);
    setSaving(false);
    if (!saved) {
      // Falhou o registro do comprovante: manter aberto é o comportamento
      // correto — sem prova do aceite, nada de terceiro é carregado.
      setFailed(true);
      return;
    }
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookies neste site"
      className="fixed inset-x-0 bottom-0 z-[100] p-2 sm:p-3"
    >
      {/* Barra compacta por padrão — o formato anterior (título + parágrafo
          longo + botões empilhados) cobria mais de meio celular pequeno
          (iPhone SE) e escondia campo de senha e botão de entrar atrás dela
          na tela de login. Texto e ações dividem a mesma linha, quebrando só
          se não couber; o detalhe por categoria continua existindo, só que
          atrás de "Personalizar" (abre por escolha da pessoa, não por padrão). */}
      <div className="mx-auto max-w-[880px] rounded-xl border border-od-border bg-od-surface p-3 shadow-2xl sm:p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="min-w-[220px] flex-1 text-[12px] leading-relaxed text-od-text-2">
            Cookies essenciais mantêm o site funcionando; os demais só com sua permissão.{" "}
            <Link href="/privacidade" className="text-od-text underline underline-offset-2">
              Política de Privacidade
            </Link>
          </p>
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => choose(ALL_CATEGORIES)}
              className="btn justify-center disabled:opacity-60"
            >
              Aceitar todos
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => choose(ESSENTIAL_ONLY)}
              className="btn-secondary justify-center disabled:opacity-60"
            >
              Só os essenciais
            </button>
            {detailed ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => choose({ analytics, marketing })}
                className="btn-secondary justify-center disabled:opacity-60"
              >
                Salvar escolha
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => setDetailed(true)}
                className="inline-flex min-h-11 items-center justify-center text-[13px] font-bold text-od-text-2 underline underline-offset-2 hover:text-od-text"
              >
                Personalizar
              </button>
            )}
          </div>
        </div>

        {detailed && (
          <div className="mt-3 space-y-2">
            <CategoryRow
              title="Essenciais"
              description="Sessão, login e segurança. Sempre ativos."
              checked
              disabled
            />
            <CategoryRow
              title="Medição de uso"
              description="Google Analytics: quais páginas são vistas, para melhorar o produto."
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryRow
              title="Publicidade"
              description="Pixel do Facebook e Google Ads: medir anúncios e evitar mostrar o mesmo anúncio para quem já é cliente."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        {failed && (
          <p className="mt-3 text-[13px] font-bold text-danger-600" role="alert">
            Não deu para registrar sua escolha agora. Tente de novo — nada foi ativado.
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-11 gap-3 rounded-lg border border-od-border p-3 ${
        disabled ? "opacity-70" : "cursor-pointer hover:border-od-border-hover"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-od-accent"
      />
      <span>
        <span className="block text-[13px] font-black text-od-text">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-od-text-2">{description}</span>
      </span>
    </label>
  );
}

// Usado no rodapé e na política de privacidade: revogar tem que ser tão fácil
// quanto aceitar.
export function CookiePreferencesLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentPreferences} className={className}>
      Preferências de cookies
    </button>
  );
}
