import Link from "next/link";
import { IconArrowRight } from "./icons";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col justify-center">
      <div className="border border-line bg-surface p-6 sm:p-7">
        <p className="eyebrow">Nao encontrado</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Nao achei esse item.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Ele pode ter sido removido ou voce pode nao ter acesso a ele.
        </p>
        <Link href="/dashboard" className="btn mt-6">
          Voltar ao painel
          <IconArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
