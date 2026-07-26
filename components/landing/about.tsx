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
 * `/upgrade`, exportação nas configurações da conta. Fundação, tamanho do time
 * e cidade ficaram de fora porque só o dono do produto tem esses números.
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
    <div>
      {/* A primeira versão era "ninguém perde cliente por falta de esforço",
          que serve para qualquer empresa de qualquer setor. Esta fala de uma
          coisa só, concreta e reconhecível: a conversa que o WhatsApp empurra
          para cima até desaparecer. */}
      <h2 className="mx-auto max-w-[22ch] text-balance text-center text-[26px] font-extrabold leading-[1.2] tracking-[-0.02em] text-od-text md:text-[32px]">
        O cliente não desistiu de você. A conversa dele{" "}
        <span className="text-od-accent">só foi empurrada pra cima.</span>
      </h2>

      <div className="mx-auto mt-14 max-w-[900px]">
        <div className="grid grid-cols-2 gap-x-8 border-b border-od-border pb-3">
          <p className="text-od-label text-od-text-3">O de sempre</p>
          <p className="text-od-label text-od-accent">No OtimizIA</p>
        </div>

        <div className="divide-y divide-od-border border-b border-od-border">
          {POSICOES.map((posicao) => (
            <div key={posicao.nosso} className="grid grid-cols-2 gap-x-8 py-5">
              <div className="flex min-w-0 items-start gap-2.5">
                <X className="mt-0.5 size-4 shrink-0 text-od-text-3" strokeWidth={2.5} />
                <span className="text-[14px] leading-snug text-od-text-3">{posicao.comum}</span>
              </div>
              <div className="flex min-w-0 items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-od-accent" strokeWidth={2.5} />
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
        <p className="mx-auto mt-12 max-w-[52ch] text-center text-[18px] leading-[1.65] text-od-text-2 md:text-[19px]">
          A gente conhece a cena. Onze da noite, o celular ainda apitando, e você
          tentando lembrar se chegou a responder aquela pessoa que parecia
          decidida.{" "}
          <span className="font-semibold text-od-text">
            Ninguém abriu o próprio negócio para virar arquivo de conversa.
          </span>{" "}
          O OtimizIA existe para a parte chata ser da máquina, e o seu dia sobrar
          para o que você faz bem: falar com gente e fechar negócio.
        </p>
      </div>
    </div>
  );
}
