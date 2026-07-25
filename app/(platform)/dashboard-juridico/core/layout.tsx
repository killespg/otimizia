import { Suspense } from "react";
import { CoreShell } from "@/components/platform/core-shell";

export default function CoreModulesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#100e12]" />}><CoreShell>{children}</CoreShell></Suspense>;
}
