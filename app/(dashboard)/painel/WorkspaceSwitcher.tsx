"use client";

import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import { updateProfession } from "./actions";

type WorkspaceOption = {
  value: string;
  label: string;
};

export function WorkspaceSwitcher({
  options,
  value,
  compact = false,
}: {
  options: WorkspaceOption[];
  value: string;
  compact?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const returnTo = useMemo(() => {
    // Páginas específicas de uma profissão (advocacia, imóveis, financeiro
    // jurídico e métricas de fundador). Trocar de área a partir delas
    // deixaria o usuário numa tela "indisponível neste workspace" — volta
    // pro painel, que existe em todas as áreas.
    const professionSpecific = ["/painel/juridico", "/painel/financeiro", "/painel/imoveis", "/painel/metricas"];
    if (professionSpecific.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
      return "/painel";
    }
    if (pathname.startsWith("/painel/contatos/")) return "/painel/contatos";
    return pathname || "/painel";
  }, [pathname]);

  return (
    <form ref={formRef} action={updateProfession} className="min-w-0">
      <input type="hidden" name="return_to" value={returnTo} />
      <label className="sr-only" htmlFor={compact ? "workspace-mobile" : "workspace-sidebar"}>
        Área ativa
      </label>
      <select
        id={compact ? "workspace-mobile" : "workspace-sidebar"}
        name="profession_type"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        className={
          compact
            ? "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm font-black text-ink outline-none focus:border-brand-600 focus:shadow-focus"
            : "field h-11 text-sm font-black"
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
