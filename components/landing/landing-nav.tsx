"use client";

import Link from "next/link";
import { Building2, BriefcaseBusiness, HelpCircle, LayoutDashboard, Sparkles, Tag } from "lucide-react";
import { NavBar } from "@/components/design-system/tubelight-navbar";
import { LogoWordmark } from "@/components/design-system/logo";

export function LandingNav() {
  return (
    <NavBar
      className="landing-cinematic-nav"
      brand={
        <Link href="/" aria-label="OtimizIA, início" className="flex min-h-11 items-center">
          <LogoWordmark height={22} />
        </Link>
      }
      items={[
        { name: "O painel", url: "#painel", icon: LayoutDashboard },
        { name: "Sócio-assistente", url: "#ia", icon: Sparkles },
        { name: "Recursos", url: "#recursos", icon: BriefcaseBusiness },
        { name: "Planos", url: "#planos", icon: Tag },
        { name: "Dúvidas", url: "#duvidas", icon: HelpCircle },
        { name: "Sobre nós", url: "#sobre", icon: Building2 },
      ]}
      actions={
        <>
          <Link
            href="/login"
            className="hidden min-h-11 items-center px-3 text-[13px] font-semibold text-od-text-2 transition-colors hover:text-od-text lg:flex"
          >
            Entrar
          </Link>
          <Link href="/signup" className="btn hidden min-h-11 px-4 text-[13px] min-[360px]:inline-flex">
            Criar conta
          </Link>
        </>
      }
      mobileActions={
        <>
          <Link href="/login" className="btn-secondary flex min-h-11 items-center justify-center text-[13px]">
            Entrar
          </Link>
          <Link href="/signup" className="btn flex min-h-11 items-center justify-center text-[13px]">
            Criar conta
          </Link>
        </>
      }
    />
  );
}
