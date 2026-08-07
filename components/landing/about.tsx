import { Check, X } from "lucide-react";

/**
 * Sobre nós.
 *
 * A primeira versão eram quatro parágrafos de duzentos caracteres em cinza, um
 * embaixo do outro. Manifesto ninguém lê: sem contraste e sem ritmo, a seção
 * virava parede de texto justamente onde a pessoa deveria decidir se gosta da
 * empresa.
 *
 * Agora a estrutura carrega o argumento sozinha. Uma frase grande abre a
 * posição e o resto é confronto lado a lado, com no máximo uma linha por lado.
 * O olho compara antes de ler, e comparação é o que prende.
 *
 * O conteúdo continua verificável: painéis por profissão em
 * `app/(dashboard)/painel`, WhatsApp com IA em `app/api/whatsapp`, preço de
 * `/upgrade`, exportação nas configurações da conta. A origem no fim da seção
 * foi informada e assinada pelo fundador; número de clientes, tamanho de time
 * e data de fundação seguem de fora até que ele os passe.
 */
const POSICOES = [
  {
    comum: "Campos em branco para você configurar",
    nosso: "Painel pronto da sua profissão",
  },
  {
    comum: "WhatsApp aberto numa aba do lado",
    nosso: "WhatsApp no painel, com a IA atendendo",
  },
  {
    comum: "Plano básico, avançado e empresarial",
    nosso: "Um preço só, R$ 39,90 por mês",
  },
  {
    comum: "Para exportar seus dados, fale com o suporte",
    nosso: "Exporta você mesmo e cancela sem multa",
  },
];

export function About() {
  return (
    <div
      data-landing-about-stage="true"
      /* Era `.landing-liquid-stage`, uma chapa de vidro leitosa de 1.200 px de
         altura. Vidro é a camada funcional que flutua sobre o conteúdo, e isto
         é conteúdo: o argumento da empresa. Sem moldura nenhuma agora — o
         respiro da seção e a faixa alternada da comparação já dão a fronteira,
         que é o mesmo caminho do `.settings-hub` (regra 4b). */
      className="mx-auto max-w-[900px]"
    >
      {/* A primeira versão era "ninguém perde cliente por falta de esforço",
          que serve para qualquer empresa de qualquer setor. Esta fala de uma
          coisa só, concreta e reconhecível: a conversa que o WhatsApp empurra
          para cima até desaparecer. */}
      <h2 className="lp-h2 mx-auto max-w-[22ch] text-center text-od-text">
        O cliente não desistiu de você. A conversa dele{" "}
        <span className="text-od-accent-hover">só foi empurrada pra cima.</span>
      </h2>

      <div className="mt-[clamp(36px,4vw,56px)]">
        {/* Régua só onde a regra 4a ainda a admite: cabeçalho de tabela. As
            quatro do corpo saíram e viraram faixa alternada. */}
        <div className="grid grid-cols-2 gap-x-6 border-b border-od-border px-4 pb-3 sm:gap-x-8">
          <p className="text-od-label text-od-text-3">O de sempre</p>
          <p className="text-od-label text-od-accent-hover">No OtimizIA</p>
        </div>

        <div className="lp-rows">
          {POSICOES.map((posicao) => (
            <div key={posicao.nosso} className="grid grid-cols-2 gap-x-6 px-4 py-5 sm:gap-x-8">
              <div className="flex min-w-0 items-start gap-2.5">
                <X className="mt-0.5 size-4 shrink-0 text-od-text-3" strokeWidth={2.5} />
                <span className="text-[14px] leading-snug text-od-text-3">{posicao.comum}</span>
              </div>
              <div className="flex min-w-0 items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-od-accent-hover" strokeWidth={2.5} />
                <span className="text-[14px] font-semibold leading-snug text-od-text">
                  {posicao.nosso}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Fecho com carga emocional. Fica depois do confronto de propósito:
            primeiro o argumento racional, que é rápido de ler, e só então a
            parte que fala com quem vive isso. Sem história de fundação, que
            seria inventada; a emoção vem da rotina do usuário, não nossa. */}
        <p className="mx-auto mt-[clamp(40px,4.5vw,64px)] max-w-[52ch] text-center text-[17px] leading-[1.65] text-od-text-2 md:text-[19px]">
          A gente conhece a cena. Onze da noite, o celular ainda apitando, e você
          tentando lembrar se chegou a responder aquela pessoa que parecia
          decidida.{" "}
          <span className="font-semibold text-od-text">
            Ninguém abriu o próprio negócio para virar arquivo de conversa.
          </span>{" "}
          O OtimizIA existe para a parte chata ser da máquina, e o seu dia sobrar
          para o que você faz bem: falar com gente e fechar negócio.
        </p>

        {/* Origem. Informada pelo dono do produto, então pode ser afirmada.
            Escrita sem o registro de "startup que nasceu numa garagem": o que
            dá credibilidade aqui é a motivação ser verificável no produto (uma
            ferramenta que não exige a pessoa virar especialista em software),
            não o tamanho da história. */}
        <div className="mx-auto mt-[clamp(40px,4.5vw,64px)] max-w-[52ch] border-t border-od-border pt-8 text-center">
          <p className="text-[15px] leading-relaxed text-od-text-2">
            Comecei o OtimizIA no sul do Brasil porque não achava certo a
            tecnologia andar para a frente deixando gente para trás. O sonho
            continua o mesmo:{" "}
            <span className="font-semibold text-od-text">
              que ninguém precise virar especialista em software para acompanhar
              o próprio tempo.
            </span>
          </p>
          {/* Assinatura sem travessão, por decisão de copy da landing: o nome
              carrega sozinho, e o papel vem abaixo em voz mais baixa. */}
          <p className="mt-6 text-[14px] font-semibold text-od-text">
            Venâncio Killes
          </p>
          <p className="mt-0.5 text-[13px] text-od-text-3">
            Fundador do OtimizIA
          </p>
        </div>
      </div>
    </div>
  );
}
