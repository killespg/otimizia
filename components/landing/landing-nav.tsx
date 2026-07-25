"use client";

import Link from "next/link";
import { LayoutDashboard, Sparkles, Wallet } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

/**
 * Os itens vivem aqui, e não na página.
 *
 * `app/page.tsx` é server component (precisa checar a sessão antes de decidir
 * entre landing e painel), e os ícones do lucide são funções — função não
 * atravessa a fronteira servidor → cliente. Passá-los como prop direto da
 * página derrubava a rota com "Functions cannot be passed directly to Client
 * Components".
 */
export function LandingNav() {
  return (
    <NavBar
      items={[
        { name: "Recursos", url: "#recursos", icon: Wallet },
        { name: "O painel", url: "#painel", icon: LayoutDashboard },
        { name: "Sócio-assistente", url: "#ia", icon: Sparkles },
      ]}
      actions={
        <>
          <Link
            href="/login"
            className="flex min-h-9 items-center rounded-md px-3 text-[13px] font-semibold text-od-text-2 transition-colors hover:text-od-text"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="flex min-h-9 items-center rounded-md bg-od-accent px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-od-accent-hover"
          >
            Criar conta
          </Link>
        </>
      }
    />
  );
}
