import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/surface";

export function RealEstatePageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return <PageHeader eyebrow={eyebrow} title={title} description={description} actions={action} />;
}

export function RealEstateSectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-white/85">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-relaxed text-od-text-3">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
