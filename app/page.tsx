import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

type IconProps = { className?: string };

function IconColumns({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4" width="5" height="16" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="9.5" y="4" width="5" height="11" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="16" y="4" width="5" height="16" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconBell({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.2 19a2 2 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconStack({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m3 13 9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Card = { name: string; meta: string; value: string; won?: boolean };

const columns: { title: string; tone: "default" | "won"; cards: Card[] }[] = [
  {
    title: "Novo",
    tone: "default",
    cards: [
      { name: "Ana Ribeiro", meta: "Responder hoje", value: "R$ 2.400" },
      { name: "Marcos Lima", meta: "Primeira conversa", value: "R$ 900" },
    ],
  },
  {
    title: "Em contato",
    tone: "default",
    cards: [
      { name: "Padaria Pão Quente", meta: "Enviar proposta", value: "R$ 5.200" },
      { name: "Júlia Costa", meta: "Chamar às 16h", value: "R$ 1.800" },
    ],
  },
  {
    title: "Proposta",
    tone: "default",
    cards: [{ name: "Construtora Vale", meta: "Ajustar valor", value: "R$ 12.000" }],
  },
  {
    title: "Ganho",
    tone: "won",
    cards: [
      { name: "Clínica Sorriso", meta: "Fechado hoje", value: "R$ 7.500", won: true },
      { name: "Bruno Alves", meta: "Recorrente", value: "R$ 3.200", won: true },
    ],
  },
];

const benefits = [
  {
    title: "O dia já abre em ordem",
    body: "Clientes atrasados, respostas de hoje e vendas abertas aparecem no topo. Nada de caçar conversa no WhatsApp.",
    icon: IconBell,
    size: "lg:row-span-2",
    visual: "priority",
  },
  {
    title: "Cada venda tem um próximo passo",
    body: "Mova a venda por etapas simples e saiba se precisa chamar, enviar proposta ou fechar.",
    icon: IconColumns,
    size: "",
    visual: "steps",
  },
  {
    title: "Tudo fica junto",
    body: "Cliente, conversa, lembrete e valor da venda no mesmo lugar.",
    icon: IconStack,
    size: "",
    visual: "stack",
  },
];

const situations = [
  "Eu respondo cliente no WhatsApp, mas depois esqueço de chamar de novo.",
  "Tenho venda aberta, mas não lembro qual era o próximo passo.",
  "Uso planilha, bloco de notas e conversa solta. Fica tudo espalhado.",
  "Quero abrir o app e saber o que preciso fazer hoje.",
];

function CtaButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const base =
    "group inline-flex items-center justify-center gap-3 rounded-full px-5 py-2.5 text-sm font-bold transition-[transform,background-color,color,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]";
  const tone =
    variant === "primary"
      ? "bg-white text-brand-950 hover:bg-brand-100"
      : "border border-white/[0.18] bg-white/[0.07] text-white hover:bg-white/[0.12]";
  return (
    <Link href={href} className={`${base} ${tone}`}>
      <span>{children}</span>
      <span
        className={
          "grid h-8 w-8 place-items-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px " +
          (variant === "primary" ? "bg-brand-950 text-white" : "bg-white/[0.12] text-white")
        }
        aria-hidden="true"
      >
        <IconArrow className="h-4 w-4" />
      </span>
    </Link>
  );
}

function SalesPreview() {
  return (
    <figure
      style={{ "--d": "260ms" } as CSSProperties}
      className="hero-rise mt-12 rounded-2xl border border-white/[0.14] bg-white/[0.07] p-1.5 shadow-[0_34px_90px_-45px_rgba(5,2,12,0.95)]"
      aria-label="Prévia do OtimizIA mostrando retornos de hoje, vendas em etapas e sugestão de próximo passo"
    >
      <div className="overflow-hidden rounded-xl bg-[#fbfaff] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700">
              <Image
                src="/otimizia-mark.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6"
              />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Hoje no OtimizIA</p>
              <p className="text-xs text-ink-muted">4 clientes para chamar</p>
            </div>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
            R$ 10.700 em aberto
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[0.86fr_1.55fr]">
          <aside className="border-b border-line bg-surface-2/70 p-4 lg:border-b-0 lg:border-r">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
              Chamar agora
            </p>
            <div className="mt-4 space-y-2">
              {[
                ["Júlia Costa", "Retorno às 16h", "Hoje"],
                ["Padaria Pão Quente", "Proposta enviada", "Atrasado"],
                ["Marcos Lima", "Primeira resposta", "Hoje"],
              ].map(([name, meta, status]) => (
                <div key={name} className="rounded-xl border border-line bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold text-ink">{name}</p>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-800">
                      {status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{meta}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                Próximo passo
              </p>
              <p className="mt-1 text-sm font-semibold text-brand-950">
                Comece pela Padaria. A proposta já está parada há 2 dias.
              </p>
            </div>
          </aside>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {columns.map((col) => (
                <div
                  key={col.title}
                  className={
                    "min-w-0 rounded-xl border p-2 " +
                    (col.tone === "won"
                      ? "border-brand-200 bg-brand-50"
                      : "border-line bg-surface-2")
                  }
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                      {col.title}
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums text-ink-muted">
                      {col.cards.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {col.cards.map((card) => (
                      <div key={card.name} className="rounded-lg border border-line bg-white p-2">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-[12px] font-bold text-ink">{card.name}</p>
                          {card.won && (
                            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                              <IconCheck className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-ink-muted">{card.meta}</p>
                        <p className="mt-1 text-[11px] font-black tabular-nums text-ink-soft">
                          {card.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function BenefitVisual({ type }: { type: string }) {
  if (type === "priority") {
    return (
      <div className="mt-8 space-y-2">
        {["Atrasados", "Para hoje", "Depois"].map((label, i) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-line bg-white p-3"
          >
            <span className="text-sm font-bold text-ink">{label}</span>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
              {i === 0 ? "02" : i === 1 ? "04" : "07"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "steps") {
    return (
      <div className="mt-7 flex items-center gap-2">
        {["Novo", "Contato", "Proposta"].map((label, i) => (
          <div key={label} className="min-w-0 flex-1">
            <div className="h-1.5 rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${(i + 1) * 31}%` }}
              />
            </div>
            <p className="mt-2 truncate text-xs font-bold text-ink-muted">{label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-7 flex flex-col gap-2 sm:flex-row">
      {["Cliente", "Venda", "Lembrete"].map((label) => (
        <div key={label} className="flex-1 rounded-xl border border-line bg-white p-3 text-center">
          <p className="text-xs font-bold text-ink-soft">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-canvas">
      <header className="fixed inset-x-0 top-4 z-30 px-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/[0.16] bg-white/90 px-3 py-2 shadow-[0_18px_45px_-28px_rgba(23,15,36,0.75)] backdrop-blur-xl">
          <Link href="/" className="nav-item flex items-center rounded-full px-2">
            <Image
              src="/otimizia-logo.png"
              alt="OtimizIA"
              width={184}
              height={54}
              priority
              sizes="184px"
              className="h-9 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="nav-item rounded-full px-4 py-2 text-sm font-bold text-ink-soft hover:bg-surface-2 hover:text-ink"
            >
              Entrar
            </Link>
            <Link href="/signup" className="btn rounded-full">
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#13091f] px-4 pb-16 pt-32 text-white lg:pb-24">
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p
              className="hero-rise inline-flex rounded-full border border-white/[0.14] bg-white/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-100"
              style={{ "--d": "0ms" } as CSSProperties}
            >
              CRM simples com IA
            </p>
            <h1
              className="hero-rise font-display mt-6 text-[clamp(4rem,13vw,9rem)] font-black leading-[0.82] tracking-[-0.05em] text-white"
              style={{ "--d": "80ms" } as CSSProperties}
            >
              OtimizIA
            </h1>
            <p
              className="hero-rise mt-6 max-w-2xl text-xl leading-relaxed text-brand-100 sm:text-2xl"
              style={{ "--d": "150ms" } as CSSProperties}
            >
              Organize clientes, vendas e lembretes em uma rotina clara. Abra o app e veja quem chamar, o que vender e qual é o próximo passo.
            </p>
            <div
              className="hero-rise mt-8 flex flex-col gap-3 sm:flex-row"
              style={{ "--d": "220ms" } as CSSProperties}
            >
              <CtaButton href="/signup">Começar grátis</CtaButton>
              <CtaButton href="/login" variant="ghost">Já tenho conta</CtaButton>
            </div>
            <p
              className="hero-rise mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-brand-100"
              style={{ "--d": "300ms" } as CSSProperties}
            >
              <span className="inline-flex items-center gap-1.5">
                <IconCheck className="h-3.5 w-3.5 text-brand-300" />
                Sem cartão
              </span>
              <span className="text-brand-300">·</span>
              Pronto em 2 min
              <span className="text-brand-300">·</span>
              Feito para quem vende sozinho
            </p>
          </div>

          <SalesPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24 lg:py-32">
        <div data-reveal className="max-w-2xl">
          <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-800">
            Por que usar
          </p>
          <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,4.5rem)] font-black leading-[0.9] tracking-[-0.04em] text-ink">
            Menos bagunça. Mais venda andando.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            O básico para sair da planilha e tocar a rotina comercial sem virar refém de ferramenta complicada.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          {benefits.map(({ icon: Icon, title, body, size, visual }, i) => (
            <article
              key={title}
              data-reveal
              style={{ "--reveal-delay": `${i * 90}ms` } as CSSProperties}
              className={"rounded-2xl border border-line bg-white p-1.5 shadow-[0_24px_60px_-42px_rgba(23,15,36,0.45)] " + size}
            >
              <div className="h-full rounded-xl bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
                      0{i + 1}
                    </p>
                    <h3 className="mt-5 text-2xl font-black leading-tight tracking-tight text-ink">
                      {title}
                    </h3>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">{body}</p>
                <BenefitVisual type={visual} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-brand-950 px-4 py-24 text-white lg:py-32">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div data-reveal>
            <p className="inline-flex rounded-full border border-white/[0.14] bg-white/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-200">
              Parece com sua rotina?
            </p>
            <h2 className="font-display mt-5 text-[clamp(2.3rem,5vw,4.25rem)] font-black leading-[0.92] tracking-[-0.04em] text-white">
              O OtimizIA foi feito para tirar isso da sua cabeça.
            </h2>
          </div>

          <div className="grid gap-3">
            {situations.map((text, i) => (
              <div
                key={text}
                data-reveal
                style={{ "--reveal-delay": `${i * 70}ms` } as CSSProperties}
                className="rounded-2xl border border-white/[0.12] bg-white/[0.07] p-5"
              >
                <p className="text-lg font-semibold leading-snug text-white">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl rounded-2xl border border-brand-200 bg-white p-1.5 shadow-[0_28px_70px_-48px_rgba(23,15,36,0.55)]">
          <div className="rounded-xl bg-brand-950 px-6 py-16 text-center text-white sm:px-12 lg:py-20">
            <div data-reveal>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
                Comece hoje
              </p>
              <h2 className="font-display mx-auto mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.75rem)] font-black leading-[0.9] tracking-[-0.04em] text-white">
                Organize a primeira venda em poucos minutos.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-brand-100">
                Salve um cliente, crie uma venda e deixe o OtimizIA mostrar o próximo passo.
              </p>
              <div className="mt-9">
                <CtaButton href="/signup">Criar conta grátis</CtaButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <Image
            src="/otimizia-logo.png"
            alt="OtimizIA"
            width={164}
            height={48}
            sizes="164px"
            className="h-8 w-auto"
          />
          <p className="text-sm font-medium text-ink-muted">
            © {new Date().getFullYear()} OtimizIA. Para quem vende sozinho.
          </p>
          <nav className="flex items-center gap-4 text-sm font-bold">
            <Link href="/login" className="nav-item text-ink-soft hover:text-ink">
              Entrar
            </Link>
            <Link href="/signup" className="nav-item text-ink-soft hover:text-ink">
              Criar conta
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
