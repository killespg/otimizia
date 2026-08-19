"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionDrawer } from "@/components/design-system/action-drawer";

export function AgendaEditDrawer({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <ActionDrawer
      label="Editar lembrete"
      title={title}
      description={description}
      initialOpen
      hideTrigger
      onClose={() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("editar");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
      }}
    >
      {children}
    </ActionDrawer>
  );
}
