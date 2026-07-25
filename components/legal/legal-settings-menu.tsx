"use client";

import { Bell, Building2, Database, Link2, LogOut, Shield, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserProfileSidebar } from "@/components/ui/menu";

export function LegalSettingsMenu() {
  const router = useRouter();

  return (
    <UserProfileSidebar
      user={{
        name: "Marina Ribeiro",
        email: "marina@ribeiroassociados.com.br",
        avatarUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=160&auto=format&fit=crop&q=80",
      }}
      navItems={[
        { label: "Dados do escritório", href: "#dados-escritorio", icon: <Building2 className="size-full" /> },
        { label: "Cargos e permissões", href: "/painel/equipe", icon: <UserRoundCog className="size-full" /> },
        { label: "Notificações", href: "#notificacoes", icon: <Bell className="size-full" /> },
        { label: "Integrações", href: "#integracoes", icon: <Link2 className="size-full" /> },
        { label: "Segurança e privacidade", href: "#seguranca", icon: <Shield className="size-full" />, isSeparator: true },
        { label: "Dados e exportação", href: "#dados-exportacao", icon: <Database className="size-full" /> },
      ]}
      logoutItem={{ label: "Voltar ao painel", icon: <LogOut className="size-full" />, onClick: () => router.push("/painel/juridico") }}
    />
  );
}
