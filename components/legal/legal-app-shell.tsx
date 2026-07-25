"use client";

import { AnimatedShapesBackground } from "@/components/design-system/animated-shapes-background";
import { LegalMobileNav } from "@/components/design-system/legal-mobile-nav";
import { LegalSidebar } from "@/components/design-system/legal-sidebar";
import { LegalQuickMenu } from "@/components/legal/legal-quick-menu";
import { LegalRecordDrawer } from "@/components/legal/legal-record-drawer";
import { LegalHeaderActions } from "@/components/legal/legal-header-actions";

export function LegalAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#100e12] text-white">
      <div className="relative flex min-h-screen overflow-hidden">
        <AnimatedShapesBackground className="fixed inset-0 opacity-80" />
        <LegalSidebar />
        <div className="relative z-10 min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center border-b border-white/[0.07] bg-[#100e12]/92 backdrop-blur-xl">
            <LegalHeaderActions />
            <LegalQuickMenu />
          </header>
          {children}
          <LegalRecordDrawer />
          <LegalMobileNav />
        </div>
      </div>
    </div>
  );
}
