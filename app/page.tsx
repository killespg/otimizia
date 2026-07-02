import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaqAccordion } from "@/components/FaqAccordion";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconBell,
  IconBot,
  IconCheck,
  IconClock,
  IconColumns,
  IconChevronRight,
  IconMessage,
  IconPhone,
  IconUsers,
  IconWallet,
  type IconProps,
} from "./(app)/icons";

const previewTasks = [
  ["Ligar para João da Silva", "Hoje, 10:00", "Alta", "bg-pink-100 text-pink-700"],
  ["Enviar proposta para Tech Sul", "Hoje, 14:30", "Média", "bg-orange-100 text-orange-700"],
  ["Atualizar cadastro", "Amanhã, 09:00", "Baixa", "bg-blue-50 text-blue-700"],
];

const proofItems = [
  ["01", "fila clara", "clientes importantes primeiro"],
  ["02", "venda visível", "valor e etapa sem procurar"],
  ["03", "IA pronta", "sugestão quando bater dúvida"],
];

const navLinks = [
  ["Recursos", "#recursos"],
  ["Como funciona", "#como-funciona"],
  ["Casos de uso", "#casos"],
];

const marqueeItems = [
  "Menos planilha bagunçada",
  "Menos caderninho",
  "Menos cliente esquecido",
  "Menos proposta perdida",
  'Menos "depois eu vejo"',
  "Menos aba aberta",
];

const steps = [
  {
    n: "01",
    title: "Cadastre o cliente",
    body: "Salve nome, WhatsApp e uma nota rápida. Leva segundos.",
    icon: IconUsers,
  },
  {
    n: "02",
    title: "Acompanhe a venda",
    body: "Mova o negócio pela etapa e veja quanto tem em aberto.",
    icon: IconColumns,
  },
  {
    n: "03",
    title: "Aja na hora certa",
    body: "O lembrete avisa e a IA sugere o próximo passo.",
    icon: IconClock,
  },
];

const agentDoes = [
  "Resume o que aconteceu no seu dia",
  "Mostra quais clientes estão mais quentes",
  "Sugere o próximo passo de cada venda",
];

const useCases = [
  {
    name: "Consultoria",
    role: "Proposta parada",
    quote:
      "Veja quais propostas estão abertas, quem precisa de resposta e qual conversa merece voltar para o topo.",
  },
  {
    name: "Serviços locais",
    role: "Agenda cheia",
    quote:
      "Organize clientes, valores e lembretes sem depender de caderno, planilha solta ou memória.",
  },
  {
    name: "Freelancer",
    role: "Várias conversas",
    quote:
      "Use a IA para resumir o dia, escolher o próximo passo e não deixar oportunidade esfriar.",
  },
];

const faqs = [
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. É tudo no navegador, funciona no computador e no celular sem baixar nada.",
  },
  {
    q: "Serve para o meu tipo de negócio?",
    a: "Sim. Foi feito para quem vende sozinho: consultoria, serviços, freela e pequeno comércio.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Cada conta enxerga só os próprios contatos e vendas. Nada é compartilhado com outras pessoas.",
  },
  {
    q: "O que a IA faz, na prática?",
    a: "Resume o seu dia, aponta quem contatar primeiro e sugere o próximo passo de cada venda.",
  },
  {
    q: "Quanto custa para começar?",
    a: "Você começa de graça. Cria a conta e usa o painel hoje mesmo, sem cartão.",
  },
];

export default function Home() {
  return (
    <main className="landing-page min-h-[100dvh] overflow-hidden bg-[#f8fbff] text-ink">
      {/* ===== Hero ===== */}
      <section className="bg-[linear-gradient(135deg,#b518ff_0%,#5c22e8_45%,#0bbfe8_100%)] p-2 sm:p-5 md:p-6">
        <div className="intro-shell relative mx-auto min-h-[calc(100dvh-1rem)] max-w-[1580px] overflow-hidden rounded-2xl bg-white shadow-[0_32px_90px_-42px_rgba(7,8,28,0.85)] md:min-h-[calc(100dvh-3rem)]">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(123,63,242,0.10)_0%,rgba(255,255,255,0)_35%,rgba(11,191,232,0.11)_100%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-[54%] top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-line to-transparent lg:block"
            aria-hidden="true"
          />

          <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
            <Link href="/" className="nav-item rounded-md">
              <Image
                src="/otimizia-logo.png"
                alt="OtimizIA"
                width={196}
                height={58}
                priority
                sizes="196px"
                className="h-9 w-auto dark:hidden sm:h-10"
              />
              <Image
                src="/otimizia-logo-dark.png"
                alt="OtimizIA"
                width={205}
                height={58}
                priority
                sizes="205px"
                className="hidden h-9 w-auto dark:block sm:h-10"
              />
            </Link>

            <nav className="hidden items-center gap-1 lg:flex" aria-label="Seções">
              {navLinks.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="nav-item rounded-full px-3.5 py-2 text-sm font-black text-ink-soft hover:bg-surface-2 hover:text-ink"
                >
                  {label}
                </Link>
              ))}
            </nav>

            <nav className="flex items-center gap-2">
              <ThemeToggle compact />
              <Link
                href="/login"
                className="nav-item hidden min-h-11 items-center rounded-full px-4 text-sm font-black text-ink-soft hover:bg-surface-2 hover:text-ink sm:inline-flex"
              >
                Entrar
              </Link>
              <LandingButton href="/signup" compact>
                Criar conta
              </LandingButton>
            </nav>
          </header>

          <div className="relative z-10 grid min-w-0 gap-10 px-5 pb-10 pt-6 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:px-10 lg:pb-12 lg:pt-8">
            <div className="intro-stagger min-w-0 max-w-2xl">
              <p className="inline-flex w-max items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-brand-800">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-700" />
                CRM simples com IA
              </p>

              <h1 className="landing-hero-title mt-6 max-w-full text-[clamp(4.35rem,18vw,9rem)] font-light leading-[0.76] tracking-[-0.04em] text-ink">
                <span className="block">Venda sem{" "}</span>
                <span className="block">perder o fio.</span>
              </h1>

              <p className="mt-6 max-w-full text-lg font-medium leading-relaxed text-ink-soft sm:max-w-xl sm:text-xl">
                O OtimizIA junta contatos, vendas e lembretes em uma tela bonita.
                Você entra, vê a prioridade e age sem ficar cavando conversa antiga.
              </p>

              <div className="hero-actions flex w-full flex-col gap-3 pt-2 sm:flex-row">
                <LandingButton href="/signup">Começar grátis</LandingButton>
                <Link
                  href="/login"
                  className="landing-secondary nav-item inline-flex min-h-14 w-full items-center justify-center rounded-full border border-line bg-white px-6 text-base font-black text-ink-soft shadow-[0_14px_34px_-28px_rgba(21,19,46,0.72)] hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 sm:w-auto"
                >
                  Entrar no painel
                </Link>
              </div>

              <div className="hero-proof grid gap-2 pt-3 sm:grid-cols-3">
                {proofItems.map(([number, title, body]) => (
                  <article
                    key={title}
                    className="motion-card rounded-lg border border-line bg-white/80 p-3 shadow-[0_12px_34px_-30px_rgba(21,19,46,0.72)]"
                  >
                    <p className="text-xs font-black text-brand-700">{number}</p>
                    <p className="mt-2 text-sm font-black text-ink">{title}</p>
                    <p className="mt-1 text-xs font-bold leading-snug text-ink-muted">
                      {body}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="hero-layer min-w-0" style={{ "--d": "190ms" } as CSSProperties}>
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Marquee: o que ele tira do seu caminho ===== */}
      <section
        aria-label="O que o OtimizIA tira do seu caminho"
        className="marquee overflow-hidden border-y border-line bg-white py-4 [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]"
      >
        <div className="marquee-track flex items-center gap-4">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span key={index} className="flex items-center gap-4">
              <span className="whitespace-nowrap text-lg font-black tracking-[-0.02em] text-ink-soft sm:text-xl">
                {item}
              </span>
              <span
                className="h-1.5 w-1.5 shrink-0 rotate-45 bg-brand-400"
                aria-hidden="true"
              />
            </span>
          ))}
        </div>
      </section>

      {/* ===== Bento: recursos ===== */}
      <section id="recursos" className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl" data-reveal>
            <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-black leading-[0.98] tracking-[-0.04em] text-ink">
              Tudo o que você precisa numa tela só.
            </h2>
            <p className="mt-4 text-lg font-medium leading-relaxed text-ink-soft">
              Contatos, vendas, lembretes e a IA no mesmo lugar. Sem pular entre
              cinco apps para fechar um negócio.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6">
            {/* Pipeline (largo) */}
            <article
              className="lift motion-card group flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-6 md:col-span-4"
              data-reveal
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <BentoIcon icon={IconColumns} />
                  <h3 className="mt-5 text-xl font-black tracking-[-0.02em] text-ink">
                    Vendas em etapas visuais
                  </h3>
                  <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-ink-soft">
                    Arraste cada negócio de novo até ganho. O valor em aberto se
                    atualiza sozinho.
                  </p>
                </div>
              </div>
              <KanbanMini />
            </article>

            {/* Agente IA (alto, gradiente) */}
            <article
              className="lift motion-card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-brand-700 bg-[linear-gradient(160deg,#5f18c4_0%,#7424e8_55%,#0bbfe8_140%)] p-6 text-white md:col-span-2 md:row-span-2"
              data-reveal
              style={{ "--reveal-delay": "70ms" } as CSSProperties}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl"
                aria-hidden="true"
              />
              <div className="relative">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white">
                  <IconBot className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-2xl font-black tracking-[-0.02em]">
                  Agente IA no fluxo
                </h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-white/85">
                  Resume o dia, aponta quem chamar primeiro e sugere o próximo
                  passo de cada venda.
                </p>
              </div>
              <div className="relative mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
                  resumir meu dia
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
                  quem chamar agora
                </span>
              </div>
            </article>

            {/* Lembretes */}
            <article
              className="lift motion-card flex flex-col rounded-2xl border border-line bg-white p-6 md:col-span-2"
              data-reveal
              style={{ "--reveal-delay": "40ms" } as CSSProperties}
            >
              <BentoIcon icon={IconBell} pink />
              <h3 className="mt-5 text-lg font-black tracking-[-0.02em] text-ink">
                Lembretes na hora certa
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
                O que atrasa sobe para o topo da fila.
              </p>
            </article>

            {/* Contatos */}
            <article
              className="lift motion-card flex flex-col rounded-2xl border border-line bg-white p-6 md:col-span-2"
              data-reveal
              style={{ "--reveal-delay": "110ms" } as CSSProperties}
            >
              <BentoIcon icon={IconUsers} />
              <h3 className="mt-5 text-lg font-black tracking-[-0.02em] text-ink">
                Contatos sem bagunça
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
                Nome, WhatsApp e histórico juntos.
              </p>
            </article>

            {/* Números (full) */}
            <article
              className="lift motion-card grid grid-cols-1 gap-6 overflow-hidden rounded-2xl border border-line bg-white p-6 md:col-span-6 md:grid-cols-[1fr_1.1fr] md:items-center"
              data-reveal
            >
              <div>
                <BentoIcon icon={IconWallet} />
                <h3 className="mt-5 text-xl font-black tracking-[-0.02em] text-ink">
                  Seus números, claros
                </h3>
                <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-ink-soft">
                  Valor em aberto, ganho no mês e conversas do dia. Tudo somado
                  para você, sem abrir planilha.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-[linear-gradient(180deg,#ffffff,#fbf8ff)] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-ink">Vendas em aberto</p>
                  <span className="text-xs font-black text-brand-700">Este mês</span>
                </div>
                <BentoChart />
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===== Como funciona ===== */}
      <section id="como-funciona" className="px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
        <div className="mx-auto max-w-6xl rounded-2xl border border-line bg-white px-6 py-12 sm:px-10 lg:py-16">
          <div className="max-w-2xl" data-reveal>
            <h2 className="text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[0.98] tracking-[-0.04em] text-ink">
              Do primeiro oi à venda fechada.
            </h2>
            <p className="mt-4 text-lg font-medium leading-relaxed text-ink-soft">
              Três passos e o painel já trabalha por você.
            </p>
          </div>

          <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
            <div
              className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-brand-200 via-line to-transparent md:block"
              aria-hidden="true"
            />
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.n}
                  className="relative"
                  data-reveal
                  style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-brand-200 bg-brand-50 font-mono text-sm font-black text-brand-700">
                      {step.n}
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-brand-700 md:hidden">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-black tracking-[-0.02em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ===== Spotlight da IA ===== */}
      <section className="px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1fr]">
          <div data-reveal>
            <h2 className="text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[0.98] tracking-[-0.04em] text-ink">
              A IA que trabalha junto com você.
            </h2>
            <p className="mt-4 max-w-lg text-lg font-medium leading-relaxed text-ink-soft">
              Não é mais um chat solto. Ela entende o seu funil e te empurra para
              a próxima ação certa.
            </p>
            <ul className="mt-8 space-y-3">
              {agentDoes.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success-50 text-success-700">
                    <IconCheck className="h-4 w-4" />
                  </span>
                  <span className="text-base font-bold text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9">
              <LandingButton href="/signup">Ver a IA em ação</LandingButton>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-line bg-[linear-gradient(160deg,#f5f0ff,#ffffff_60%)] p-6 sm:p-8"
            data-reveal
            style={{ "--reveal-delay": "80ms" } as CSSProperties}
          >
            <div className="flex items-center gap-3">
              <Image
                src="/otimizia-mark.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <div>
                <p className="text-sm font-black text-ink">Agente OtimizIA</p>
                <p className="text-xs font-bold text-success-700">pronto para ajudar</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-brand-700 px-4 py-2.5 text-sm font-bold text-white">
                O que eu faço primeiro hoje?
              </div>
              <div className="w-fit max-w-[88%] rounded-2xl rounded-bl-sm border border-line bg-white px-4 py-3 text-sm font-medium leading-relaxed text-ink-soft">
                Comece pela Tech Sul: a proposta está aberta há 3 dias e o lembrete
                venceu. Depois, retorne a ligação da Marina.
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700">
                resumir meu dia
              </span>
              <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700">
                próximos passos
              </span>
              <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700">
                quem está mais quente
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Casos de uso ===== */}
      <section id="casos" className="px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl" data-reveal>
            <p className="inline-flex w-max items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-700" />
              Na prática
            </p>
            <h2 className="mt-5 text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[0.98] tracking-[-0.04em] text-ink">
              Feito para quem toca tudo sozinho.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {useCases.map((useCase, index) => (
              <figure
                key={useCase.name}
                className="lift motion-card flex h-full flex-col justify-between rounded-2xl border border-line bg-white p-6"
                data-reveal
                style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
              >
                <blockquote className="text-lg font-bold leading-snug tracking-[-0.01em] text-ink">
                  {useCase.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <Initials name={useCase.name} />
                  <div>
                    <p className="text-sm font-black text-ink">{useCase.name}</p>
                    <p className="text-xs font-bold text-ink-muted">{useCase.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="perguntas" className="px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.7fr_1fr]">
          <div data-reveal>
            <h2 className="text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[0.98] tracking-[-0.04em] text-ink">
              Perguntas frequentes.
            </h2>
            <p className="mt-4 max-w-sm text-lg font-medium leading-relaxed text-ink-soft">
              O básico antes de você criar a conta.
            </p>
          </div>

          <FaqAccordion items={faqs.map(({ q, a }) => ({ q, a }))} />
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div
          className="mx-auto grid max-w-6xl gap-5 rounded-2xl bg-[linear-gradient(135deg,#5c22e8,#0bbfe8)] p-2 shadow-[0_32px_90px_-48px_rgba(7,8,28,0.8)] lg:grid-cols-[1fr_auto]"
          data-reveal
        >
          <div className="rounded-xl bg-white p-6 sm:p-8">
            <p className="text-sm font-black text-brand-700">Comece hoje</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(2rem,5vw,4.2rem)] font-black leading-[0.96] tracking-[-0.04em] text-ink">
              Abra o painel e organize a primeira venda.
            </h2>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-ink-soft">
              Cadastre um contato, crie uma venda e deixe o próximo lembrete pronto.
              Leva menos de dois minutos.
            </p>
          </div>
          <div className="flex items-center rounded-xl bg-white/12 p-6 text-white sm:p-8">
            <LandingButton href="/signup" inverted>
              Criar conta grátis
            </LandingButton>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function LandingButton({
  href,
  children,
  compact = false,
  inverted = false,
}: {
  href: string;
  children: React.ReactNode;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "landing-button nav-item group inline-flex items-center justify-center rounded-full font-black shadow-[0_18px_34px_-20px_rgba(92,34,232,0.86)] active:scale-[0.97] whitespace-nowrap " +
        (compact
          ? "min-h-11 gap-2 px-4 text-sm"
          : "min-h-14 w-full gap-3 px-6 text-base sm:w-auto") +
        " " +
        (inverted
          ? "bg-white text-brand-800 hover:bg-brand-50"
          : "bg-brand-700 text-white hover:bg-brand-800")
      }
    >
      <span>{children}</span>
      <span
        className={
          "grid rounded-full transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 " +
          (compact ? "h-7 w-7" : "h-8 w-8") +
          " " +
          (inverted ? "bg-brand-100 text-brand-800" : "bg-white/15 text-white")
        }
      >
        <IconArrowRight className="m-auto h-4 w-4" />
      </span>
    </Link>
  );
}

function BentoIcon({ icon: Icon, pink = false }: { icon: (p: IconProps) => JSX.Element; pink?: boolean }) {
  return (
    <span
      className={
        "grid h-11 w-11 place-items-center rounded-full " +
        (pink ? "bg-pink-100 text-pink-600" : "bg-brand-50 text-brand-700")
      }
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

function KanbanMini() {
  const columns = [
    { label: "Novo", tone: "bg-blue-400", cards: 2 },
    { label: "Proposta", tone: "bg-brand-500", cards: 3 },
    { label: "Ganho", tone: "bg-success-500", cards: 1 },
  ];
  return (
    <div className="mt-6 grid grid-cols-3 gap-2.5" aria-hidden="true">
      {columns.map((col) => (
        <div key={col.label} className="rounded-lg border border-line bg-[#f8fbff] p-2.5">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${col.tone}`} />
            <span className="text-[11px] font-black text-ink-soft">{col.label}</span>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {Array.from({ length: col.cards }).map((_, i) => (
              <div key={i} className="rounded-md border border-line bg-white px-2 py-1.5">
                <span className="block h-1.5 w-3/4 rounded-full bg-line-strong" />
                <span className="mt-1.5 block h-1.5 w-2/5 rounded-full bg-brand-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BentoChart() {
  return (
    <svg viewBox="0 0 620 180" className="mt-3 h-32 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bentoArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7b3ff2" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#7b3ff2" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[32, 74, 116].map((y) => (
        <line key={y} x1="16" x2="604" y1={y} y2={y} stroke="#dbe2ef" strokeDasharray="5 7" />
      ))}
      <path
        className="preview-chart-area"
        d="M18 138 C60 145 74 96 112 104 C150 112 154 66 196 74 C240 82 236 118 276 110 C318 101 322 58 360 62 C402 66 408 104 448 92 C486 80 494 46 536 52 C570 56 578 84 602 70 L602 180 L18 180 Z"
        fill="url(#bentoArea)"
      />
      <path
        className="preview-chart-line"
        pathLength={1}
        d="M18 138 C60 145 74 96 112 104 C150 112 154 66 196 74 C240 82 236 118 276 110 C318 101 322 58 360 62 C402 66 408 104 448 92 C486 80 494 46 536 52 C570 56 578 84 602 70"
        fill="none"
        stroke="#6d28d9"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <circle className="preview-chart-dot" cx="536" cy="52" r="6" fill="#6d28d9" />
    </svg>
  );
}

function Initials({ name }: { name: string }) {
  const value =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OI";
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#6d28d9,#3b16c6)] text-sm font-black text-white">
      {value}
    </span>
  );
}

function ProductPreview() {
  return (
    <figure className="preview-float w-full rounded-[1.65rem] border border-white/70 bg-white/45 p-2 shadow-[0_34px_90px_-52px_rgba(7,8,28,0.85)] [&_*]:min-w-0">
      <div className="overflow-hidden rounded-[1.2rem] border border-line bg-[#f8fbff] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/otimizia-mark.png"
              alt=""
              width={38}
              height={38}
              className="h-10 w-10"
            />
            <div>
              <p className="text-sm font-black text-ink">Painel OtimizIA</p>
              <p className="text-xs font-bold text-ink-muted">Hoje, tudo em ordem</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-success-50 px-2.5 py-1 text-xs font-black text-success-700">
              Online
            </span>
            <span className="hidden rounded-full bg-brand-700 px-3 py-1 text-xs font-black text-white sm:inline-flex">
              IA ativa
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Valor aberto" value="R$ 252k" icon={IconWallet} />
              <MiniMetric label="Clientes" value="128" icon={IconPhone} pink />
              <MiniMetric label="Conversas" value="87" icon={IconMessage} pink />
            </div>

            <div className="preview-card rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-ink">Vendas em aberto</p>
                <span className="text-xs font-black text-brand-700">Este mês</span>
              </div>
              <svg viewBox="0 0 620 220" className="mt-4 h-52 w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="homeArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#7b3ff2" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#7b3ff2" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 78, 116, 154, 192].map((y) => (
                  <line
                    key={y}
                    x1="24"
                    x2="600"
                    y1={y}
                    y2={y}
                    stroke="#dbe2ef"
                    strokeDasharray="5 7"
                  />
                ))}
                <g className="preview-chart">
                  <path
                    className="preview-chart-area"
                    d="M26 176 C58 183 72 128 110 137 C146 145 151 98 190 106 C230 115 227 72 270 81 C309 90 315 122 350 106 C389 88 397 51 438 62 C470 70 477 107 510 93 C546 78 557 54 600 43 L600 220 L26 220 Z"
                    fill="url(#homeArea)"
                  />
                  <path
                    className="preview-chart-line"
                    pathLength={1}
                    d="M26 176 C58 183 72 128 110 137 C146 145 151 98 190 106 C230 115 227 72 270 81 C309 90 315 122 350 106 C389 88 397 51 438 62 C470 70 477 107 510 93 C546 78 557 54 600 43"
                    fill="none"
                    stroke="#6d28d9"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                  <circle className="preview-chart-dot" cx="438" cy="62" r="7" fill="#6d28d9" />
                </g>
              </svg>
            </div>
          </div>

          <div className="space-y-4">
            <div className="preview-card rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-ink">Fila de tarefas</p>
                <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-black text-ink-muted">
                  3 pendentes
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {previewTasks.map(([title, time, priority, tone], index) => (
                  <li
                    key={title}
                    className="preview-row flex items-center gap-3 rounded-lg border border-line px-3 py-3"
                    style={{ "--d": `${260 + index * 70}ms` } as CSSProperties}
                  >
                    <span className="preview-node h-4 w-4 rounded-full border border-brand-200 bg-white" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-ink">{title}</p>
                      <p className="text-xs font-bold text-ink-muted">{time}</p>
                    </div>
                    <span className={`rounded-md px-2.5 py-1 text-xs font-black ${tone}`}>
                      {priority}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="preview-card rounded-lg border border-line bg-white p-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/otimizia-mark.png"
                  alt=""
                  width={30}
                  height={30}
                  className="h-8 w-8"
                />
                <div>
                  <p className="text-sm font-black text-ink">Agente IA</p>
                  <p className="text-xs font-bold text-success-700">pronto para ajudar</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-ink-soft">
                Comece pelos clientes com proposta aberta e lembrete vencido.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <span className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-black text-brand-700">
                  resumir dia
                </span>
                <span className="rounded-lg bg-pink-50 px-3 py-2 text-xs font-black text-pink-700">
                  próximos passos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function MiniMetric({
  label,
  value,
  icon: Icon,
  pink = false,
}: {
  label: string;
  value: string;
  icon: (props: { className?: string }) => JSX.Element;
  pink?: boolean;
}) {
  return (
    <div className="preview-card rounded-lg border border-line bg-white p-3">
      <span
        className={
          "grid h-9 w-9 place-items-center rounded-full " +
          (pink ? "bg-pink-100 text-pink-600" : "bg-brand-50 text-brand-700")
        }
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-xs font-bold text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-black tracking-[-0.03em] text-ink">{value}</p>
    </div>
  );
}

function SiteFooter() {
  const groups = [
    {
      title: "Produto",
      links: [
        ["Entrar", "/login"],
        ["Criar conta", "/signup"],
        ["Recursos", "#recursos"],
      ],
    },
    {
      title: "No painel",
      links: [
        ["Como funciona", "#como-funciona"],
        ["Casos de uso", "#casos"],
        ["Perguntas", "#perguntas"],
      ],
    },
  ];

  return (
    <footer className="border-t border-line bg-white px-5 py-14 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Image
            src="/otimizia-logo.png"
            alt="OtimizIA"
            width={196}
            height={58}
            sizes="176px"
            className="h-9 w-auto dark:hidden"
          />
          <Image
            src="/otimizia-logo-dark.png"
            alt="OtimizIA"
            width={205}
            height={58}
            sizes="176px"
            className="hidden h-9 w-auto dark:block"
          />
          <p className="mt-4 max-w-xs text-sm font-medium leading-relaxed text-ink-soft">
            O CRM simples com IA para quem vende sozinho e não pode perder cliente
            no caminho.
          </p>
          <Link
            href="/signup"
            className="nav-item mt-6 inline-flex items-center gap-1.5 text-sm font-black text-brand-700 hover:text-brand-900"
          >
            Começar grátis
            <IconArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">
              {group.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {group.links.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="nav-item text-sm font-bold text-ink-soft hover:text-brand-700"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-ink-muted">
          © 2026 OtimizIA. Feito para empreendedores que fazem acontecer.
        </p>
        <p className="text-xs font-bold text-ink-muted">CRM simples com IA</p>
      </div>
    </footer>
  );
}
