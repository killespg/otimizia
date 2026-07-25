"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ShaderBackground from "@/components/ui/shader-background";

export function SellerDashboardBackground({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const [previewOverride, setPreviewOverride] = useState<boolean | null>(null);

  useEffect(() => {
    function handleVisibility(event: Event) {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      if (typeof customEvent.detail?.enabled === "boolean") {
        setPreviewOverride(customEvent.detail.enabled);
      }
    }

    window.addEventListener("dashboard-background-visibility", handleVisibility);
    return () => window.removeEventListener("dashboard-background-visibility", handleVisibility);
  }, []);

  const isVisible = previewOverride ?? enabled;

  if (!isVisible || (pathname !== "/painel" && pathname !== "/painel/imoveis/dashboard")) return null;

  return <ShaderBackground />;
}
