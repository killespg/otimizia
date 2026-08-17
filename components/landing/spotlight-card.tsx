import { Sparkles } from "lucide-react";

/**
 * Dark card with a mouse-tracked radial spotlight (CSS custom properties)
 * and a rotating 3D icosahedron accent. Reserved for occasional highlights.
 * `localSpotlight` (default true) can be turned off when a page already has
 * its own page-wide pointlight (see MouseSpotlight) — avoids stacking two
 * glows on top of each other in the same spot.
 */
export function SpotlightCard() {
  return (
    <div
      className="relative flex flex-col items-start gap-10 border-b border-od-border pb-10 md:flex-row md:items-center"
    >
      <div className="relative z-[1] flex-1">
        <h3 className="mb-3 text-[28px] font-extrabold tracking-[-0.01em] text-white">
          Tim em ação
        </h3>
        {/* Ele não só responde: as tools em lib/ai/tools escrevem no banco
            (create_contact, create_deal, move_deal, schedule_property_visit).
            Por isso os exemplos abaixo misturam pergunta e ordem — assistente
            que só sugere é commodity. A descrição da seção (em app/page.tsx)
            já explica o que ele faz; aqui só a lista de ordens reais. */}
      </div>
      {/* divide-y/border-y só valem a partir de md:, onde a lista fica
          compacta ao lado do texto. Empilhada no mobile (flex-col), cinco
          linhas pra separar quatro itens era ruído — o ícone de brilho já
          marca cada exemplo. */}
      <ul className="relative z-[1] w-full flex-1 md:divide-y md:divide-od-border md:border-y md:border-od-border">
        {[
          "Quem eu preciso chamar hoje?",
          "Cadastra a Carla e abre uma negociação",
          "Move o negócio do João pra proposta",
          "Agenda visita no apartamento do Sumaré sexta às 15h",
        ].map((pergunta) => (
          <li
            key={pergunta}
            className="flex items-center gap-2.5 py-3 text-[13px] text-od-text-2"
          >
            <Sparkles className="size-3.5 shrink-0 text-od-accent-hover" strokeWidth={2} />
            {pergunta}
          </li>
        ))}
      </ul>
    </div>
  );
}
