import * as React from "react";
import Link from "next/link";
import { ArrowRight, Building2, Gavel, TrendingUp } from "lucide-react";
import { AnimatedShapesBackground } from "@/components/design-system/animated-shapes-background";

/**
 * A dobra.
 *
 * O que ela dizia antes era só metade do produto: "a IA atende seu WhatsApp"
 * é uma função, e quem chega não descobria que isto é um CRM nem que existe um
 * painel por profissão — as três profissões só apareciam 1.800 px abaixo, na
 * lista de recursos. A sobrancelha de 12 px em cinza terciário era o único
 * lugar da dobra que dizia a categoria.
 *
 * Agora a ordem é categoria → promessa → prova → caminho: o rótulo nomeia o
 * que é, o título carrega a promessa (que é o que o webhook faz de verdade: a
 * IA responde e a detecção de intenção abre a negociação no funil), e o
 * seletor de profissão logo abaixo do CTA mostra que o produto se divide em
 * três e leva direto para a seção que prova isso.
 *
 * Duas ações, não uma. A anterior tinha só "Começar grátis"; quem ainda não
 * decidiu não tinha para onde ir a não ser rolar, e o "Entrar" da barra só
 * aparecia a partir de `lg`.
 */
const PROFISSOES = [
  { icon: TrendingUp, label: "Vendedor autônomo", curto: "Vendas" },
  { icon: Gavel, label: "Escritório de advocacia", curto: "Advocacia" },
  { icon: Building2, label: "Corretor de imóveis", curto: "Imóveis" },
];

export function Hero({ animated = false }: { animated?: boolean }) {
  return (
    <section className="relative isolate overflow-hidden pb-[clamp(48px,6vw,80px)] pt-[clamp(56px,7vw,104px)] text-center">
      {animated ? <AnimatedShapesBackground /> : null}

      <div className="lp-shell relative z-10">
        <p className="text-od-label text-od-text-2">
          CRM com WhatsApp e IA
        </p>

        {/* As duas frases quebram entre si, e não onde a linha calhar de
            estourar: com `text-wrap: balance` sozinho o acento começava no
            meio da linha ("WhatsApp. Você") e a promessa perdia o contorno.
            `block` sem breakpoint — em 390 px cada frase ocupa duas linhas e
            elas se encavalavam, que é justamente o caso que o `block` existe
            para evitar. Medido: as duas caixas nasciam a 34 px uma da outra,
            dentro da mesma linha de texto. */}
        <h1 className="lp-h1 mx-auto mt-5 max-w-[21ch]">
          <span className="block text-od-text">A IA atende seu WhatsApp.</span>
          <span className="block text-od-accent-hover">Você entra quando importa.</span>
        </h1>

        <p className="lp-lead mx-auto mt-5 max-w-[54ch]">
          Ela responde na hora, percebe quem está pronto pra fechar e abre a
          negociação no seu funil sozinha. Do lado de dentro, o painel já vem
          montado para a sua profissão.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            id="hero-cta"
            href="/signup"
            className="btn w-full max-w-[280px] sm:w-auto"
          >
            Começar grátis
            <ArrowRight className="size-4" strokeWidth={2} />
          </a>
          <Link href="#painel" className="btn-secondary w-full max-w-[280px] sm:w-auto">
            Ver o painel por dentro
          </Link>
        </div>

        <p className="mt-4 text-[13px] text-od-text-3">
          Sem cartão de crédito. A conta entra no painel na hora.
        </p>

        {/* Este bloco ocupa o lugar da esteira de logos que rolava aqui. Ela
            tinha a forma de um mural de clientes mas listava segmentos de
            público — parecia prova social sem ser —, animava para sempre e não
            levava a lugar nenhum. Três atalhos nomeados entregam a mesma
            informação (para quem é o produto) parados, e ainda são caminho. */}
        <div className="mt-[clamp(40px,5vw,64px)]">
          <p className="text-od-label text-od-text-3">Escolha por onde você trabalha</p>
          <ul className="mx-auto mt-4 flex max-w-[680px] flex-wrap items-center justify-center gap-2.5">
            {PROFISSOES.map(({ icon: Icon, label, curto }) => (
              <li key={label}>
                <Link
                  href="#recursos"
                  className="btn-soft text-[13px]"
                  aria-label={label}
                >
                  <Icon className="size-4 text-od-accent-hover" strokeWidth={2} />
                  <span className="sm:hidden" aria-hidden>{curto}</span>
                  <span className="hidden sm:inline" aria-hidden>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
