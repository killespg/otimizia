import Link from "next/link";
import { signup } from "../actions";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="glass w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Comece a organizar suas vendas em minutos.
        </p>

        {searchParams.error && (
          <p className="mt-4 rounded-xl border border-red-200/60 bg-red-50/80 p-3 text-sm text-red-700 backdrop-blur">
            {searchParams.error}
          </p>
        )}

        <form action={signup} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Seu nome</label>
            <input
              name="name"
              type="text"
              className="glass-input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">E-mail</label>
            <input
              name="email"
              type="email"
              required
              className="glass-input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Senha</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="glass-input mt-1"
            />
          </div>
          <button type="submit" className="glass-btn w-full py-2.5">
            Criar conta grátis
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
