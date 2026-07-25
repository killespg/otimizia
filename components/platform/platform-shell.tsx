import Link from "next/link";
import { Grid2X2 } from "lucide-react";
import { AnimatedShapesBackground } from "@/components/design-system/animated-shapes-background";
import { LogoWordmark } from "@/components/design-system/logo";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#100e12] text-white"><AnimatedShapesBackground className="fixed inset-0 opacity-70" /><div className="relative z-10"><header className="sticky top-0 z-30 flex h-16 items-center border-b border-white/[0.07] bg-[#100e12]/92 px-5 backdrop-blur-xl md:px-8"><Link href="/painel/workspaces"><LogoWordmark height={30} /></Link><Link href="/painel/workspaces" className="ml-auto inline-flex h-full items-center gap-2 border-x border-white/[0.07] px-4 text-[11px] text-white/42 hover:bg-white/[0.03] hover:text-white/72"><Grid2X2 size={14} />Todos os workspaces</Link></header>{children}</div></div>;
}
