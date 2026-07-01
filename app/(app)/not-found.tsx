import Link from "next/link";
import { IconArrowRight, IconSearch } from "./icons";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col justify-center">
      <section className="panel p-6 sm:p-7">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700">
          <IconSearch className="h-6 w-6" />
        </span>
        <p className="mt-5 text-sm font-black text-brand-700">Não encontrado</p>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">
          Não achei esse item.
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
          Ele pode ter sido removido ou você pode não ter acesso.
        </p>
        <Link href="/dashboard" className="btn mt-6">
          Voltar ao painel
          <IconArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
