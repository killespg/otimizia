import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AssistantChat } from "@/components/AssistantChat";
import { PendingButton } from "@/components/PendingButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";
import { SidebarNav, MobileTabBar } from "./AppNav";
import { Avatar } from "./Avatar";
import { IconChevronRight, IconLogout } from "./icons";

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="nav-item flex items-center gap-2.5 rounded-md hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <Image
        src={compact ? "/otimizia-mark.png" : "/otimizia-logo.png"}
        alt="OtimizIA"
        width={compact ? 36 : 196}
        height={compact ? 36 : 58}
        sizes={compact ? "36px" : "196px"}
        priority
        className={(compact ? "h-9 w-9" : "h-10 w-auto") + " dark:hidden"}
      />
      <Image
        src={compact ? "/otimizia-mark-dark.png" : "/otimizia-logo-dark.png"}
        alt="OtimizIA"
        width={compact ? 36 : 205}
        height={compact ? 36 : 58}
        sizes={compact ? "36px" : "205px"}
        priority
        className={(compact ? "h-9 w-9" : "h-10 w-auto") + " hidden dark:block"}
      />
    </Link>
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email = user.email ?? "Conta";
  const handle = email.split("@")[0] || "João";
  const displayName =
    typeof user.user_metadata?.name === "string" && user.user_metadata.name
      ? user.user_metadata.name
      : handle;

  return (
    <div className="app-frame min-h-[100dvh] bg-[linear-gradient(135deg,#b518ff_0%,#5c22e8_43%,#0bbfe8_100%)] p-2 sm:p-5 md:p-6">
      <div className="app-shell mx-auto flex min-h-[calc(100dvh-1rem)] max-w-[1580px] overflow-hidden rounded-2xl bg-white shadow-[0_32px_90px_-42px_rgba(7,8,28,0.85)] md:min-h-[calc(100dvh-3rem)]">
        <aside className="hidden w-[250px] shrink-0 flex-col border-r border-line bg-white md:flex">
          <div className="flex h-[92px] items-center px-6">
            <Logo />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            <SidebarNav />
          </div>

          <div className="space-y-3 px-5 pb-5">
            <ThemeToggle className="w-full justify-between" />

            <div className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-3">
              <Avatar name={displayName} className="h-11 w-11 text-[13px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">
                  {displayName}
                </p>
                <p className="truncate text-xs font-medium text-ink-muted">
                  Administrador
                </p>
              </div>
              <IconChevronRight className="h-4 w-4 rotate-90 text-ink-muted" />
            </div>

            <form action={logout}>
              <PendingButton
                className="nav-item flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
                aria-label="Sair da conta"
                pendingLabel="Saindo"
              >
                <span className="inline-flex items-center gap-2">
                  <IconLogout className="h-[18px] w-[18px]" />
                  Sair
                </span>
                <IconChevronRight className="h-4 w-4 text-ink-muted" />
              </PendingButton>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[#f8fbff]">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/92 px-4 backdrop-blur-xl md:hidden">
            <Logo />
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <form action={logout}>
                <PendingButton
                  className="nav-item flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-bold text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
                  aria-label="Sair da conta"
                  iconOnly
                  pendingLabel="Saindo"
                >
                  <IconLogout className="h-[18px] w-[18px]" />
                  <span className="sr-only">Sair</span>
                </PendingButton>
              </form>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-8 md:pt-7 lg:px-10">
            {children}
          </main>
        </div>

        <MobileTabBar />
      </div>

      <AssistantChat />
    </div>
  );
}
