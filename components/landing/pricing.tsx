import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * Planos.
 *
 * O preço vem do que o produto realmente cobra em /upgrade — R$ 39,90/mês mais
 * R$ 10 por pessoa extra — e não de um valor de vitrine. O teste grátis é o
 * mesmo que o cadastro entrega hoje, sem pedir cartão.
 *
 * Duas colunas dentro de um único volume: é uma comparação, não dois
 * recipientes concorrendo.
 *
 * O volume era de vidro (`.landing-liquid-stage`) e voltou a ser conteúdo.
 * Preço não é chrome nem overlay, e o vidro custava contraste medido: o
 * rótulo "PARA COMEÇAR" dava 4,48:1 sobre a chapa leitosa, abaixo do mínimo
 * AA de 4,5:1 para texto pequeno.
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
    <div
      data-landing-pricing-stage="true"
      data-landing-stage="pricing"
      className="landing-cinematic-stage mx-auto grid max-w-[900px] divide-y divide-od-border px-6 md:grid-cols-2 md:divide-x md:divide-y-0 md:px-0"
    >
      <div className="py-8 md:px-9">
        <p className="text-od-label text-od-text-3">Para começar</p>
        <p className="lp-h3 mt-3 text-od-text">Teste grátis</p>
        <p className="mt-2 text-[14px] leading-relaxed text-od-text-2">
          Sem cartão de crédito. Você cria a conta e já entra no painel da sua profissão,
          com tudo funcionando.
        </p>
        <Link
          href="/signup"
          className="btn mt-6"
        >
          Criar minha conta
          <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
      </div>

      <div className="py-8 md:px-9">
        <p className="text-od-label text-od-text-3">Depois do teste</p>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="lp-h3 text-od-text">R$ 39,90</span>
          <span className="text-[14px] text-od-text-2">por mês</span>
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-od-text-2">
          Mais R$ 10 por pessoa extra na equipe. Cancele quando quiser, sem multa.
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
