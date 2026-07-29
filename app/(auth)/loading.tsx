/**
 * Esqueleto das telas de entrada.
 *
 * Era a versão clara antiga: fundo em gradiente magenta para azul, card
 * branco, painel #f8fbff e sombra de 90px. Como o produto é escuro, isso
 * significava um flash branco de tela inteira antes do formulário aparecer,
 * exatamente no primeiro contato de quem ainda não tem conta.
 *
 * Agora espelha a estrutura do AuthShell (mesma grade, mesmos planos), para o
 * conteúdo entrar no lugar do esqueleto sem a página saltar.
 */
export default function AuthLoading() {
  return (
    <main className="min-h-[100dvh] bg-od-bg p-0 sm:grid sm:place-items-center sm:p-5">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-6xl overflow-hidden border-od-border bg-od-surface sm:min-h-[min(760px,calc(100dvh-2.5rem))] sm:rounded-lg sm:border lg:grid-cols-[1.05fr_.95fr]">
        <div className="hidden animate-pulse flex-col justify-between border-r border-od-border bg-od-sidebar p-10 lg:flex">
          <div>
            <div className="h-8 w-40 rounded bg-od-border" />
            <div className="mt-16 h-9 w-full max-w-lg rounded bg-od-border" />
            <div className="mt-3 h-9 w-3/4 max-w-md rounded bg-od-border" />
            <div className="mt-6 h-4 w-full max-w-md rounded bg-od-border/60" />
          </div>
          <div className="border-y border-od-border">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-4 border-t border-od-border py-5 first:border-t-0">
                <div className="size-[18px] shrink-0 rounded bg-od-border" />
                <div className="flex-1">
                  <div className="h-4 w-48 rounded bg-od-border" />
                  <div className="mt-2 h-3 w-64 max-w-full rounded bg-od-border/60" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-[100dvh] items-center px-5 py-10 sm:min-h-0 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md animate-pulse">
            <div className="mb-10 h-[30px] w-40 rounded bg-od-border lg:hidden" />
            <div className="h-8 w-36 rounded bg-od-border" />
            <div className="mt-3 h-4 w-64 max-w-full rounded bg-od-border/60" />
            <div className="mt-6 space-y-4">
              <div className="h-11 rounded bg-od-muted-surface" />
              <div className="h-11 rounded bg-od-muted-surface" />
              <div className="h-12 rounded bg-od-accent/25" />
            </div>
            <div className="mt-7 border-t border-od-border pt-5">
              <div className="h-4 w-44 rounded bg-od-border/60" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
