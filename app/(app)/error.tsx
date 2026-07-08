"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logError } from "@/lib/logger";
import { IconAlert, IconArrowRight } from "./icons";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("app.error-boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col justify-center">
      <section className="panel p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-700">
            <IconAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-danger-700">Erro</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">
              Algo não saiu como esperado.
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
              Tente de novo. Se continuar acontecendo, volte ao painel e siga por
              outro caminho.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn">
            Tentar de novo
          </button>
          <Link href="/dashboard" className="btn-soft">
            Voltar ao painel
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
