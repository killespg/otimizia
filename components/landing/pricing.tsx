import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * Planos. O preço vem do que o produto realmente cobra em /upgrade:
 * R$ 39,90/mês mais R$ 10 por pessoa extra. O teste grátis é o mesmo que o
 * cadastro entrega hoje, sem pedir cartão.
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
    <div className="oz-pricing">
      <div className="oz-card oz-plan">
        <p className="oz-label">Para começar</p>
        <p className="oz-h3" style={{ marginTop: 12, fontSize: 26 }}>
          Teste grátis
        </p>
        <p className="oz-body" style={{ marginTop: 12 }}>
          30 dias grátis, sem cartão de crédito. Você cria a conta e já entra no painel da sua profissão, com tudo
          funcionando.
        </p>
        <Link href="/signup" className="oz-btn" style={{ marginTop: 28 }}>
          Criar minha conta
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      <div className="oz-card oz-plan oz-plan-featured">
        <p className="oz-label">Depois do teste</p>
        <p className="oz-price">
          <b>R$ 39,90</b>
          <span className="oz-body">por mês</span>
        </p>
        <p className="oz-body" style={{ marginTop: 10 }}>
          Mais R$ 10 por pessoa extra na equipe. Cancele quando quiser, sem multa.
        </p>
        <p className="oz-small" style={{ marginTop: 4 }}>
          Menos que um café por dia.
        </p>
        <ul className="oz-includes">
          {INCLUSO.map((item) => (
            <li key={item}>
              <Check size={16} strokeWidth={2.5} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
