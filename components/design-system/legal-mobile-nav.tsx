"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CalendarClock, LayoutDashboard, Menu, MessageCircle } from "lucide-react";

const tabs = [
  { icon: LayoutDashboard, label: "Início", href: "/painel/juridico" },
  { icon: BriefcaseBusiness, label: "Processos", href: "/painel/juridico/processos" },
  { icon: MessageCircle, label: "WhatsApp", href: "/painel/whatsapp?workspace=law_office" },
  { icon: CalendarClock, label: "Calendário", href: "/painel/calendario?workspace=law_office" },
  { icon: Menu, label: "Mais", href: "/painel/configuracoes" },
];

export function LegalMobileNav() {
  const pathname = usePathname();
  return <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-start justify-around border-t border-white/[0.08] bg-[#121016]/95 px-2 pt-2 backdrop-blur-xl lg:hidden">{tabs.map(({ icon: Icon, label, href }) => { const base = href.split("?")[0]; const active = pathname === base || (base !== "/painel/juridico" && pathname.startsWith(base)); return <Link key={href} href={href} className={`relative flex min-w-14 flex-col items-center gap-1.5 px-2 py-1 text-[10px] font-medium ${active ? "text-violet-300" : "text-white/35"}`}>{active ? <span className="absolute -top-2 h-0.5 w-8 bg-violet-400" /> : null}<Icon size={18} strokeWidth={active ? 2.2 : 1.8} />{label}</Link>; })}</nav>;
}
