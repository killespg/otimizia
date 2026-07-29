import { Suspense } from "react";
import { LegalAppShell } from "@/components/legal/legal-app-shell";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#100e12]" />}><LegalAppShell>{children}</LegalAppShell></Suspense>;
}
