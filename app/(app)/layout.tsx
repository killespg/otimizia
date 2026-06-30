import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";
import { SidebarNav, MobileTabBar } from "./AppNav";
import { Avatar } from "./Avatar";
import { IconLogout } from "./icons";

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="nav-item flex items-center gap-2.5 rounded hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <Image
        src={compact ? "/otimizia-mark.png" : "/otimizia-logo.png"}
        alt="OtimizIA"
        width={compact ? 32 : 184}
        height={compact ? 32 : 54}
        sizes={compact ? "32px" : "184px"}
        priority
        className={compact ? "h-8 w-8" : "h-9 w-auto"}
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
  const handle = email.split("@")[0];

  return (
    <div className="min-h-[100dvh] md:flex">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNav />
        </div>

        {/* ---- Conta (rodapé da sidebar) ---- */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar name={handle} className="h-9 w-9 text-[12px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight text-ink">
                {handle}
              </p>
              <p className="truncate font-mono text-[11px] leading-tight text-ink-muted">
                {email}
              </p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="nav-item mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
              aria-label="Sair da conta"
            >
              <IconLogout className="h-[18px] w-[18px]" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ---- Conteúdo ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header slim só no mobile (a sidebar some; nav vai pra tab bar). */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas px-4 md:hidden">
          <Logo />
          <form action={logout}>
            <button
              type="submit"
              className="nav-item flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
              aria-label="Sair da conta"
            >
              <IconLogout className="h-[18px] w-[18px]" />
              <span className="sr-only">Sair</span>
            </button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-6 md:pb-14 md:pt-10 lg:px-10">
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
