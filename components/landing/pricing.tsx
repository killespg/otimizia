import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { LandingMark } from "./mark";

/**
 * Planos.
 *
 * O preço vem do que o produto realmente cobra em /upgrade — R$ 39,90/mês mais
 * R$ 10 por pessoa extra — e não de um valor de vitrine. O teste grátis é o
 * mesmo que o cadastro entrega hoje, sem pedir cartão.
 *
 * Duas colunas, sem card: o traço curto (LandingMark) pontua a comparação
 * no lugar da régua de ponta a ponta.
 */
const INCLUSO = [
  "Contatos, funil e lembretes sem limite",
  "WhatsApp conectado ao painel",
  "Tim, o sócio-assistente, com voz e anexo",
  "Calendário com link para Google e Apple",
  "Painel da sua profissão: imóveis, jurídico ou vendas",
  "App instalável, com notificação no celular",
];

export function Pricing() {
  return (
    <div className="grid items-center gap-10 md:grid-cols-[1fr_auto_1fr] md:gap-12">
      <div className="px-0">
        <p className="text-od-label text-od-text-3">Para começar</p>
        <p className="mt-3 text-od-title text-od-text">Teste grátis</p>
        <p className="mt-2 text-[14px] leading-relaxed text-od-text-2">
          30 dias grátis, sem cartão de crédito. Você cria a conta e já entra no painel da sua profissão,
          com tudo funcionando.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-od-accent px-5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Criar minha conta
          <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
      </div>

      <LandingMark className="mx-auto md:hidden" />
      <LandingMark orientation="vertical" className="hidden justify-self-center md:block" />

      <div className="px-0">
        <p className="text-od-label text-od-text-3">Depois do teste</p>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-od-title text-od-text">R$ 39,90</span>
          <span className="text-[14px] text-od-text-2">por mês</span>
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-od-text-2">
          Mais R$ 10 por pessoa extra na equipe. Cancele quando quiser, sem multa.
        </p>
        <p className="mt-1 text-[12px] text-od-text-3">
          Menos que um café por dia.
        </p>
        <ul className="mt-5 space-y-2.5">
          {INCLUSO.map((item) => (
            <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-od-text-2">
              <Check className="mt-0.5 size-4 shrink-0 text-od-accent-hover" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
