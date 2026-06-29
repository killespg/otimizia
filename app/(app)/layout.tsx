import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";

const nav = [
  { href: "/dashboard", label: "Painel" },
  { href: "/pipeline", label: "Funil" },
  { href: "/contacts", label: "Contatos" },
  { href: "/tasks", label: "Tarefas" },
];

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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/30 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-bold text-brand-700">
              MeuCRM
            </Link>
            <nav className="flex gap-5 text-sm">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-slate-600 transition hover:text-slate-900"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user.email}</span>
            <form action={logout}>
              <button className="text-slate-600 transition hover:text-slate-900">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
