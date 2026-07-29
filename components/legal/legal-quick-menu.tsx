"use client";

import { CalendarPlus, FilePlus2, Plus, Scale, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { MenuContainer, MenuItem } from "@/components/ui/fluid-menu";

export function LegalQuickMenu() {
  const router = useRouter();

  return (
    <div className="relative z-50 hidden size-14 place-items-center lg:grid">
      <MenuContainer direction="left" appearance="quiet" label="Criar novo registro">
        <MenuItem
          label="Abrir ou fechar atalhos"
          icon={<div className="relative size-5"><Plus size={20} className="absolute inset-0 transition-all duration-300 [div[data-expanded=true]_&]:rotate-90 [div[data-expanded=true]_&]:scale-0 [div[data-expanded=true]_&]:opacity-0" /><X size={20} className="absolute inset-0 -rotate-90 scale-0 opacity-0 transition-all duration-300 [div[data-expanded=true]_&]:rotate-0 [div[data-expanded=true]_&]:scale-100 [div[data-expanded=true]_&]:opacity-100" /></div>}
        />
        <MenuItem label="Novo processo" icon={<Scale size={19} />} onClick={() => router.push("/painel/juridico/processos?novo=processo")} />
        <MenuItem label="Novo cliente" icon={<UserPlus size={19} />} onClick={() => router.push("/painel/contatos?novo=cliente")} />
        <MenuItem label="Novo prazo" icon={<CalendarPlus size={19} />} onClick={() => router.push("/painel/juridico/prazos?novo=prazo")} />
        <MenuItem label="Novo documento" icon={<FilePlus2 size={19} />} onClick={() => router.push("/painel/juridico/documentos?novo=documento")} />
      </MenuContainer>
    </div>
  );
}
