import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold text-brand-700">MeuCRM</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Criar conta grátis
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          O CRM simples para quem vende sozinho
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
          Organize seus contatos, acompanhe cada negócio no funil e nunca mais
          esqueça um follow-up. Feito para autônomos, freelancers e pequenos
          empreendedores.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Começar agora — é grátis
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            title: "Funil visual",
            body: "Arraste seus negócios entre as etapas e veja onde está cada venda.",
          },
          {
            title: "Lembretes",
            body: "Tarefas e follow-ups com data para nunca deixar um cliente esfriar.",
          },
          {
            title: "Tudo em um lugar",
            body: "Contatos, histórico de conversas e resultados num painel só.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
