"use client";

import { useSearchParams } from "next/navigation";
import { LegalAppShell } from "@/components/legal/legal-app-shell";
import { PlatformShell } from "@/components/platform/platform-shell";

export function CoreShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  return searchParams.get("workspace") === "law_office"
    ? <LegalAppShell>{children}</LegalAppShell>
    : <PlatformShell>{children}</PlatformShell>;
}
