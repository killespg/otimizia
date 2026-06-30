"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconAlert, IconArrowRight } from "./icons";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col justify-center">
      <div className="border border-t-2 border-line border-t-danger-500 bg-surface p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-danger-50 text-danger-700">
            <IconAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Algo nao saiu como esperado.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Tente de novo. Se continuar acontecendo, volte ao painel e siga
              por outro caminho.
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
      </div>
    </div>
  );
}
