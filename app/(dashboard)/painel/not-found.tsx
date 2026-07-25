import Link from "next/link";

export default function PainelNotFound() {
  return <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-start justify-center"><p className="text-sm font-semibold text-od-text-2">Página não encontrada</p><h1 className="mt-3 text-2xl font-bold">Este endereço não existe no painel</h1><p className="mt-2 text-sm leading-6 text-ink-soft">Use a navegação ao lado ou volte para a visão geral.</p><Link href="/painel" className="btn mt-6">Voltar ao painel</Link></section>;
}
