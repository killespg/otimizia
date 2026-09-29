import { Check, X } from "lucide-react";

/**
 * Sobre nós. Conteúdo verificável: painéis por profissão em
 * app/(dashboard)/painel, WhatsApp com IA em app/api/whatsapp, preço de
 * /upgrade, exportação nas configurações da conta. A origem no fim foi
 * informada e assinada pelo fundador; número de clientes, tamanho de time e
 * data de fundação seguem de fora até ele passar. Assinatura sem travessão,
 * por decisão de copy.
 */
const POSICOES = [
  { comum: "Campos em branco para você configurar", nosso: "Painel pronto da sua profissão" },
  { comum: "WhatsApp aberto numa aba do lado", nosso: "WhatsApp no painel, com a IA atendendo" },
  { comum: "Plano básico, avançado e empresarial", nosso: "Um preço só, R$ 39,90 por mês" },
  { comum: "Para exportar seus dados, fale com o suporte", nosso: "Exporta você mesmo e cancela sem multa" },
];

export function About() {
  return (
    <div>
      <h2 className="oz-about-h">
        O cliente não desistiu de você. A conversa dele <em>só foi empurrada pra cima.</em>
      </h2>

      <div className="oz-compare">
        <div className="oz-compare-head">
          <p className="oz-label">O de sempre</p>
          <p className="oz-label" style={{ color: "var(--oz-blue-soft)" }}>
            No OtimizIA
          </p>
        </div>
        {POSICOES.map((posicao) => (
          <div key={posicao.nosso} className="oz-compare-row">
            <div>
              <X size={16} strokeWidth={2.5} aria-hidden />
              <span>{posicao.comum}</span>
            </div>
            <div>
              <Check size={16} strokeWidth={2.5} aria-hidden />
              <span>{posicao.nosso}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="oz-story">
        A gente conhece a cena. Onze da noite, o celular ainda apitando, e você tentando lembrar se chegou a responder aquela
        pessoa que parecia decidida. <strong>Ninguém abriu o próprio negócio para virar arquivo de conversa.</strong> O
        OtimizIA existe para a parte chata ser da máquina, e o seu dia sobrar para o que você faz bem: falar com gente e
        fechar negócio.
      </p>

      <div className="oz-founder">
        <span className="oz-rule" aria-hidden="true" />
        <p>
          Comecei o OtimizIA no sul do Brasil porque não achava certo que quem abre o próprio negócio tivesse também que
          aprender a usar software. O sonho continua o mesmo:{" "}
          <strong>que ninguém precise virar especialista em software para acompanhar o próprio tempo.</strong>
        </p>
        <p style={{ marginTop: 24, color: "#fff", fontWeight: 600, fontSize: 14 }}>Venâncio Killes</p>
        <p className="oz-small" style={{ marginTop: 2 }}>
          Fundador do OtimizIA
        </p>
      </div>
    </div>
  );
}
