"use client";

import Link from "next/link";
import { Building2, HelpCircle, LayoutDashboard, Sparkles, Tag, Wallet } from "lucide-react";
import { NavBar } from "@/components/design-system/tubelight-navbar";
import { LogoWordmark } from "@/components/design-system/logo";

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
      className="landing-liquid-nav"
      brand={
        <Link href="/" aria-label="OtimizIA, início" className="flex min-h-11 items-center">
          <LogoWordmark height={22} />
        </Link>
      }
      items={[
        { name: "Recursos", url: "#recursos", icon: Wallet },
        { name: "O painel", url: "#painel", icon: LayoutDashboard },
        { name: "Sócio-assistente", url: "#ia", icon: Sparkles },
        { name: "Planos", url: "#planos", icon: Tag },
        { name: "Dúvidas", url: "#duvidas", icon: HelpCircle },
        { name: "Sobre nós", url: "#sobre", icon: Building2 },
      ]}
      actions={
        <>
          <Link
            href="/login"
            className="hidden min-h-11 items-center rounded-md px-3 text-[13px] font-semibold text-od-text-2 transition-colors hover:text-od-text lg:flex"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="liquid-glass-control liquid-glass-control--tinted hidden min-h-11 items-center rounded-full px-4 text-[13px] font-semibold text-white min-[360px]:flex"
          >
            Criar conta
          </Link>
        </>
      }
      mobileActions={
        <>
          <Link
            href="/login"
            className="liquid-glass-control flex min-h-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold text-od-text-2"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="liquid-glass-control liquid-glass-control--tinted flex min-h-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold text-white"
          >
            Criar conta
          </Link>
        </>
      }
    />
  );
}
