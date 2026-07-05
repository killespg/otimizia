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
    if (pathname.startsWith("/contacts/")) return "/contacts";
    return pathname || "/dashboard";
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
            ? "h-9 max-w-[132px] rounded-md border border-line bg-surface px-2 text-xs font-black text-ink outline-none focus:border-brand-600 focus:shadow-focus"
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
