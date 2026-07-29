"use client";

import { AlertTriangle } from "lucide-react";

export default function PainelError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-start justify-center">
      <AlertTriangle className="text-amber-300" size={24} />
      <h1 className="mt-5 text-2xl font-bold">Este módulo não carregou</h1>
      <p className="mt-2 max-w-[65ch] text-sm leading-6 text-ink-soft">Seus dados continuam seguros. Tente carregar novamente; se o problema continuar, volte ao painel e abra o módulo de novo.</p>
      <button type="button" onClick={reset} className="btn mt-6">Tentar novamente</button>
    </section>
  );
}
