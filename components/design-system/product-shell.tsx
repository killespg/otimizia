import type { ReactNode } from "react";
import { ProductShellNavigation } from "@/components/design-system/product-shell-navigation";
import { ProductShellTopbar } from "@/components/design-system/product-shell-topbar";
import type { ProductNavigationContract } from "@/lib/design-system/navigation";

type Props = {
  children: ReactNode;
  navigation: ProductNavigationContract;
  workspaceKey: string;
  workspaceOptions: Array<{ value: string; label: string }>;
  workspaceLabel: string;
  organizationName: string;
  displayName: string;
  initials: string;
  notificationCount?: number;
  dataNotice?: string | null;
  trialBanner?: ReactNode;
};

export function ProductShell({
  children,
  navigation,
  workspaceKey,
  workspaceOptions,
  workspaceLabel,
  organizationName,
  displayName,
  initials,
  notificationCount,
  dataNotice,
  trialBanner,
}: Props) {
  return (
    <div className={`dark product-workspace workspace-${workspaceKey}`}>
      <ProductShellNavigation
        navigation={navigation}
        workspaceKey={workspaceKey}
        workspaceOptions={workspaceOptions}
        workspaceLabel={workspaceLabel}
        organizationName={organizationName}
        displayName={displayName}
      />
      <div className="product-content flex min-h-screen min-w-0 flex-col bg-od-bg">
        <ProductShellTopbar
          displayName={displayName}
          initials={initials}
          variant={navigation.namespace}
          notificationCount={notificationCount}
        />
        {trialBanner}
        {dataNotice ? (
          <div
            className="mx-5 mt-4 rounded-[var(--radius-control)] border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 sm:mx-6 lg:mx-8"
            role="status"
          >
            {dataNotice}
          </div>
        ) : null}
        {/* Goteira do conteúdo: 20px no telefone (o título da página encosta
            aqui), 24 no tablet e 32 no desktop. Quem sangra até a borda usa
            -mx-5 no mobile para casar com este valor. */}
        <main className="w-full flex-1 px-5 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-7">
          {children}
        </main>
      </div>
    </div>
  );
}
